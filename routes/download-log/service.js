const DownloadLog = require("../../models/DownloadLog");
const puppeteer = require("puppeteer");
const axios = require("axios");
const sanitizeHtml = require("sanitize-html");
const dns = require("dns").promises;
const net = require("net");

const DEFAULT_PDF_OPTIONS = Object.freeze({
  format: "A4",
  orientation: "portrait",
  border: {
    top: ".1in",
    right: ".1in",
    bottom: ".2in",
    left: ".1in",
  },
  printBackground: true,
});

const ALLOWED_PDF_FORMATS = new Set([
  "letter",
  "legal",
  "tabloid",
  "ledger",
  "a0",
  "a1",
  "a2",
  "a3",
  "a4",
  "a5",
  "a6",
]);

const HTML_TO_PDF_ALLOWED_HOSTS = new Set(
  (process.env.HTML_TO_PDF_ALLOWED_HOSTS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);

const HTML_TO_PDF_ALLOWED_ASSET_PREFIXES = (process.env.HTML_TO_PDF_ALLOWED_ASSET_PREFIXES || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const MAX_HTML_BYTES = parsePositiveInt(
  process.env.HTML_TO_PDF_MAX_HTML_BYTES,
  1024 * 1024
);
const MAX_FETCH_BYTES = parsePositiveInt(
  process.env.HTML_TO_PDF_MAX_FETCH_BYTES,
  MAX_HTML_BYTES
);
const AXIOS_TIMEOUT_MS = parsePositiveInt(
  process.env.HTML_TO_PDF_FETCH_TIMEOUT_MS,
  5000
);
const PAGE_TIMEOUT_MS = parsePositiveInt(
  process.env.HTML_TO_PDF_RENDER_TIMEOUT_MS,
  10000
);

const HTML_SANITIZER_OPTIONS = {
  allowedTags: [
    "html",
    "head",
    "body",
    "meta",
    "title",
    "style",
    "div",
    "span",
    "p",
    "br",
    "hr",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "small",
    "sub",
    "sup",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "dl",
    "dt",
    "dd",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "caption",
    "colgroup",
    "col",
    "section",
    "article",
    "header",
    "footer",
    "main",
    "aside",
    "figure",
    "figcaption",
    "blockquote",
    "pre",
    "code",
    "a",
  ],
  allowedAttributes: {
    "*": ["class", "id", "style", "title", "dir", "lang", "align"],
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    table: ["width", "border", "cellpadding", "cellspacing"],
    th: ["colspan", "rowspan", "width", "height"],
    td: ["colspan", "rowspan", "width", "height"],
    col: ["width"],
    meta: ["charset", "name", "content", "http-equiv"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel", "data"],
  allowedSchemesAppliedToAttributes: ["href", "src", "cite"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  parser: {
    lowerCaseAttributeNames: true,
  },
  transformTags: {
    a: function (tagName, attribs) {
      return {
        tagName,
        attribs: {
          ...attribs,
          rel: "noopener noreferrer",
        },
      };
    },
  },
};

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createSafeError(statusCode, publicMessage, internalMessage) {
  const error = new Error(internalMessage || publicMessage);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}

function getHtmlByteLength(value) {
  return Buffer.byteLength(value || "", "utf8");
}

function normalizeInputHtml(html) {
  if (typeof html !== "string") {
    throw createSafeError(400, "html must be a non-empty string.");
  }

  const trimmedHtml = html.trim();
  if (!trimmedHtml) {
    throw createSafeError(400, "html Missing");
  }

  if (getHtmlByteLength(trimmedHtml) > MAX_HTML_BYTES) {
    throw createSafeError(413, "HTML payload is too large.");
  }

  const sanitizedHtml = sanitizeHtml(trimmedHtml, HTML_SANITIZER_OPTIONS).trim();
  if (!sanitizedHtml) {
    throw createSafeError(400, "html Missing");
  }

  if (getHtmlByteLength(sanitizedHtml) > MAX_HTML_BYTES) {
    throw createSafeError(413, "HTML payload is too large.");
  }

  return sanitizedHtml;
}

function isPrivateOrReservedIp(ipAddress) {
  if (!net.isIP(ipAddress)) {
    return false;
  }

  if (net.isIPv4(ipAddress)) {
    const octets = ipAddress.split(".").map(Number);
    const first = octets[0];
    const second = octets[1];

    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      first >= 224 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 0) ||
      (first === 192 && second === 168) ||
      (first === 198 && (second === 18 || second === 19))
    );
  }

  const normalized = ipAddress.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

async function validateFetchUrl(rawUrl) {
  if (!rawUrl) {
    return null;
  }

  if (typeof rawUrl !== "string") {
    throw createSafeError(400, "Invalid URL.");
  }

  if (HTML_TO_PDF_ALLOWED_HOSTS.size === 0) {
    throw createSafeError(
      400,
      "URL fetching is not enabled for this endpoint.",
      "URL input rejected because HTML_TO_PDF_ALLOWED_HOSTS is empty."
    );
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch (error) {
    throw createSafeError(400, "Invalid URL.");
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (parsedUrl.protocol !== "https:") {
    throw createSafeError(400, "Only https URLs are allowed.");
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw createSafeError(400, "Credentialed URLs are not allowed.");
  }

  if (hostname === "localhost" || hostname.endsWith(".local")) {
    throw createSafeError(400, "URL host is not allowed.");
  }

  if (!HTML_TO_PDF_ALLOWED_HOSTS.has(hostname)) {
    throw createSafeError(400, "URL host is not allowed.");
  }

  if (isPrivateOrReservedIp(hostname)) {
    throw createSafeError(400, "URL host is not allowed.");
  }

  try {
    const resolvedAddresses = await dns.lookup(hostname, {
      all: true,
      verbatim: true,
    });

    if (!resolvedAddresses.length) {
      throw new Error("No DNS records found.");
    }

    if (resolvedAddresses.some((entry) => isPrivateOrReservedIp(entry.address))) {
      throw createSafeError(400, "URL host is not allowed.");
    }
  } catch (error) {
    if (error.publicMessage) {
      throw error;
    }

    throw createSafeError(
      400,
      "Unable to validate URL.",
      `DNS validation failed for ${hostname}: ${error.message}`
    );
  }

  parsedUrl.hash = "";
  return parsedUrl.toString();
}

async function fetchHtmlFromUrl(url) {
  const response = await axios.get(url, {
    timeout: AXIOS_TIMEOUT_MS,
    responseType: "text",
    maxContentLength: MAX_FETCH_BYTES,
    maxBodyLength: MAX_FETCH_BYTES,
    headers: {
      Accept: "text/html,application/xhtml+xml",
    },
    validateStatus: function (status) {
      return status >= 200 && status < 300;
    },
  });

  const contentType = String(response.headers["content-type"] || "").toLowerCase();
  if (
    contentType &&
    !contentType.includes("text/html") &&
    !contentType.includes("application/xhtml+xml")
  ) {
    throw createSafeError(400, "URL did not return HTML content.");
  }

  if (typeof response.data !== "string") {
    throw createSafeError(400, "URL did not return HTML content.");
  }

  if (getHtmlByteLength(response.data) > MAX_FETCH_BYTES) {
    throw createSafeError(413, "Fetched HTML is too large.");
  }

  return response.data;
}

function normalizeBoolean(value, fallbackValue) {
  if (typeof value === "boolean") {
    return value;
  }

  return fallbackValue;
}

function normalizeMarginValue(value, fallbackValue) {
  if (typeof value !== "string") {
    return fallbackValue;
  }

  const trimmedValue = value.trim();
  if (/^0$/.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^((\d+(\.\d+)?)|(\.\d+))(px|in|cm|mm)$/.test(trimmedValue)) {
    return trimmedValue;
  }

  return fallbackValue;
}

function buildSafePdfOptions(option) {
  const inputOptions =
    option && typeof option === "object" && !Array.isArray(option) ? option : {};

  const requestedFormat = String(
    inputOptions.format || DEFAULT_PDF_OPTIONS.format
  ).toLowerCase();

  const inputMargins =
    inputOptions.margin && typeof inputOptions.margin === "object"
      ? inputOptions.margin
      : inputOptions.border && typeof inputOptions.border === "object"
        ? inputOptions.border
        : {};

  return {
    format: ALLOWED_PDF_FORMATS.has(requestedFormat)
      ? requestedFormat.toUpperCase()
      : DEFAULT_PDF_OPTIONS.format,
    landscape:
      inputOptions.landscape === true || inputOptions.orientation === "landscape",
    margin: {
      top: normalizeMarginValue(
        inputMargins.top,
        DEFAULT_PDF_OPTIONS.border.top
      ),
      right: normalizeMarginValue(
        inputMargins.right,
        DEFAULT_PDF_OPTIONS.border.right
      ),
      bottom: normalizeMarginValue(
        inputMargins.bottom,
        DEFAULT_PDF_OPTIONS.border.bottom
      ),
      left: normalizeMarginValue(
        inputMargins.left,
        DEFAULT_PDF_OPTIONS.border.left
      ),
    },
    printBackground: normalizeBoolean(
      inputOptions.printBackground,
      DEFAULT_PDF_OPTIONS.printBackground
    ),
  };
}

function isAllowedBrowserRequest(requestUrl) {
  if (requestUrl === "about:blank" || requestUrl.startsWith("data:")) {
    return true;
  }

  return HTML_TO_PDF_ALLOWED_ASSET_PREFIXES.some((prefix) =>
    requestUrl.startsWith(prefix)
  );
}

module.exports.get = function (req, res) {
  let condition = req.query;
  DownloadLog.find(condition, (err, data) => {
    if (err) {
      return res
        .status(400)
        .json({ success: false, message: "Db Error Occurred." });
    } else {
      return res
        .status(200)
        .json({ success: true, message: "data fetched", data: data });
    }
  });
};

module.exports.post = function (req, res) {
  let newDownloadLog = new DownloadLog(req.body);
  newDownloadLog.save((err, data) => {
    if (err) {
      return res
        .status(400)
        .json({ success: false, message: "Db Error Occurred." });
    } else {
      return res
        .status(200)
        .json({ success: true, message: "data fetched", data: data });
    }
  });
};

module.exports.HtmlToPdf = async function (req, res) {
  let browser;

  res.set({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });

  try {
    let { url, html, option } = req.body;

    if (url) {
      const safeUrl = await validateFetchUrl(url);
      html = await fetchHtmlFromUrl(safeUrl);
    }

    const safeHtml = normalizeInputHtml(html);
    const pdfOptions = buildSafePdfOptions(option);

    browser = await puppeteer.launch({
      headless: "new",
      // These flags are kept for environments where Chromium sandboxing is unavailable.
      // Remove them if your deployment platform supports the Chromium sandbox.
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS);
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);

    page.on("request", function (request) {
      if (isAllowedBrowserRequest(request.url())) {
        request.continue();
        return;
      }

      request.abort("blockedbyclient");
    });

    await page.setContent(safeHtml, {
      waitUntil: "load",
      timeout: PAGE_TIMEOUT_MS,
    });

    const pdfBuffer = await page.pdf(pdfOptions);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="document.pdf"',
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", {
      message: error.message,
      stack: error.stack,
      url: req.body && req.body.url,
      htmlBytes:
        req.body && typeof req.body.html === "string"
          ? getHtmlByteLength(req.body.html)
          : 0,
    });

    const statusCode = error.statusCode || 500;
    const publicMessage = error.publicMessage || "Unable to generate PDF.";

    return res
      .status(statusCode)
      .json({ success: false, message: publicMessage });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("Failed to close PDF browser:", closeError);
      }
    }
  }
};
