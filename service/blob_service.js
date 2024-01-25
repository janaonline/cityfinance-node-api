const { BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions } = require("@azure/storage-blob");
const uuid = require("uuid");

const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const containerName = process.env.AZURE_CONTAINER_NAME; // Replace with your Azure Storage container name
const AZURE_STORAGE_ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY;

const sharedKeyCredential = new StorageSharedKeyCredential(AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY);
const blobServiceClient = new BlobServiceClient(`https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`, sharedKeyCredential);

const webExecutables = /\.(aspx|asp|css|swf|xhtml|rhtml|shtml|jsp|js|pl|php|cgi|zip|exe)$/i;
const specialCharacters = /[`^*?":&'@{},$=!#+<>]/;
const fileConfig = {
    minSize: "File size less than the minimum file size",
    maxSize: "File size greater than the maximum file size",
    specialChar: "File name should not contain special characters: ` ^ * ? \"  & ' @ { } , $ = ! # + < >",
    webExecutables: "aspx, asp, css, swf, xhtml, rhtml, shtml, jsp, js, pl, php, cgi, zip, exe file types not allowed",
};

if (!AZURE_STORAGE_ACCOUNT_NAME ) {
    process.exit(
        "Azure Storage credentials not found! Check your environment variables for AZURE_STORAGE_ACCOUNT_NAME."
    );
}

// Azure Storage doesn't require explicit credentials or region configuration
async function generateSignedUrl(data) {
    return new Promise(async (resolve, reject) => {
      try {
        const file_name = data.file_name;
        let { custom, strictName } = data;
        strictName = strictName === "true";
        let fileNameWithoutExt = file_name.substring(
          0,
          file_name.lastIndexOf(".")
        );
        const file_extension =
          file_name.lastIndexOf(".") > 0
            ? file_name.substring(file_name.lastIndexOf("."))
            : "";

        const date = new Date().toLocaleString().split("/").join("-");
        if (specialCharacters.test(fileNameWithoutExt)) {
          reject({ message: fileConfig.specialChar });
          return;
        } else if (webExecutables.test(file_name)) {
          reject({ message: fileConfig.webExecutables });
          return;
        }
        let fileNameManipulationParams = {date, strictName, fileNameWithoutExt, file_extension, custom, data};
        let { blobName, file_alias } = fileNameManipulation(fileNameManipulationParams);
        const containerClient =
          blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobName);
        const startDate = new Date();
        const expiryDate = new Date(startDate);
        expiryDate.setMinutes(startDate.getMinutes() + 60);
        const sasToken = await blobClient.generateSasUrl({
          permissions: BlobSASPermissions.parse("c"),
          expiresOn: expiryDate,
          startsOn: startDate,
        });

        const path = removePrefix(blobClient?.url);
        resolve({
          url: sasToken,
          file_alias,
          file_url: blobClient?.url,
          path
        });
      } catch (error) {
        reject(error);
      }
    });
}

/**
 * The function removes a specific prefix from a given URL if it starts with that prefix.
 * @param url - The `url` parameter is a string that represents a URL.
 * @returns The function will return the URL with the prefix removed if the URL starts with the
 * specified prefix. If the URL does not start with the prefix, it will return the original URL.
 */
function removePrefix(url) {
  try {
    const prefixToRemove = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${containerName}`;
    if (url.startsWith(prefixToRemove)) {
      return url.substring(prefixToRemove.length);
    }
    return url;
  } catch (error) {
    throw {message: `removePrefix: ${error.message}`}
  }
}

/**
 * The function `fileNameManipulation` takes in various parameters and returns an object with a
 * `blobName` and `file_alias` property based on the provided inputs.
 * @param date - A string representing the date in the format "YYYY:MM:DD, HH:MM:SS".
 * @param strictName - A boolean value indicating whether the file name should strictly follow the
 * provided fileNameWithoutExt or not.
 * @param fileNameWithoutExt - The `fileNameWithoutExt` parameter is a string that represents the name
 * of the file without the file extension. For example, if the file name is "document.txt", the
 * `fileNameWithoutExt` parameter would be "document".
 * @param file_extension - The `file_extension` parameter is a string that represents the extension of
 * the file. It could be something like ".txt", ".jpg", ".pdf", etc.
 * @param custom - The `custom` parameter is an optional string that can be provided to customize the
 * file name. If a value is provided for `custom`, it will be used as part of the file name. If no
 * value is provided or if it is an empty string, a unique identifier (UUID) will be
 * @param data - The `data` parameter is an object that may contain a `folder` property. If the
 * `folder` property exists, it will be used to construct the `blobName` by appending it to the
 * `file_alias`. If the `folder` property does not exist, the `file_alias`
 * @returns an object with two properties: "blobName" and "file_alias".
 */
function fileNameManipulation(params) {
    try {
        let {date, strictName, fileNameWithoutExt, file_extension, custom, data} = params
        const formattedDate = date.split(":").join("-").split(", ").join("_");
        let file_alias;
        if (strictName) {
            file_alias = fileNameWithoutExt + file_extension;
        } else {
            file_alias =
                custom || custom === ""
                    ? `${fileNameWithoutExt}_${formattedDate}${file_extension}`
                    : `${fileNameWithoutExt}_${uuid.v4()}${file_extension}`;
        }
        let blobName = data?.folder
            ? `${data.folder}/${file_alias}`
            : file_alias;
        return { blobName, file_alias };
    } catch (error) {
        throw { message: `fileNameManipulation: ${error.message}`}
    }
}

module.exports.generateSignedUrl = generateSignedUrl;
