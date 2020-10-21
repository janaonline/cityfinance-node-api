(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["common"],{

/***/ "./src/app/dashboard/data-entry/data-entry.service.ts":
/*!************************************************************!*\
  !*** ./src/app/dashboard/data-entry/data-entry.service.ts ***!
  \************************************************************/
/*! exports provided: DataEntryService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DataEntryService", function() { return DataEntryService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _environments_environment__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../environments/environment */ "./src/environments/environment.ts");
/* harmony import */ var _angular_common_http__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/common/http */ "./node_modules/@angular/common/fesm5/http.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};



var DataEntryService = /** @class */ (function () {
    function DataEntryService(http) {
        this.http = http;
    }
    DataEntryService.prototype.bulkEntry = function (files) {
        var httpOptions = { headers: new _angular_common_http__WEBPACK_IMPORTED_MODULE_2__["HttpHeaders"]({ 'Accept': 'multipart/form-data' }) };
        return this.http.post(_environments_environment__WEBPACK_IMPORTED_MODULE_1__["environment"].api.url + 'ledger/bulkEntry', files, httpOptions);
    };
    DataEntryService.prototype.createEntry = function (ledgerForm) {
        var httpOptions = { headers: new _angular_common_http__WEBPACK_IMPORTED_MODULE_2__["HttpHeaders"]({ 'Accept': 'multipart/form-data' }) };
        return this.http.post(_environments_environment__WEBPACK_IMPORTED_MODULE_1__["environment"].api.url + 'ledger/entry', ledgerForm, httpOptions);
    };
    DataEntryService.prototype.getLedgerLogs = function (criteria) {
        return this.http.post(_environments_environment__WEBPACK_IMPORTED_MODULE_1__["environment"].api.url + 'ledger/getAll', criteria);
    };
    DataEntryService.prototype.excelToJsonConvertor = function (files) {
        var httpOptions = { headers: new _angular_common_http__WEBPACK_IMPORTED_MODULE_2__["HttpHeaders"]({ 'Accept': 'multipart/form-data' }) };
        return this.http.post(_environments_environment__WEBPACK_IMPORTED_MODULE_1__["environment"].api.url + 'ledger/excelToJsonConvertor', files, httpOptions);
    };
    DataEntryService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])({
            providedIn: 'root'
        }),
        __metadata("design:paramtypes", [_angular_common_http__WEBPACK_IMPORTED_MODULE_2__["HttpClient"]])
    ], DataEntryService);
    return DataEntryService;
}());



/***/ })

}]);
//# sourceMappingURL=common.js.map