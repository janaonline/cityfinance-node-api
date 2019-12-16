(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["data-entry-data-entry-module"],{

/***/ "./src/app/dashboard/data-entry/bulk-entry/bulk-entry.component.html":
/*!***************************************************************************!*\
  !*** ./src/app/dashboard/data-entry/bulk-entry/bulk-entry.component.html ***!
  \***************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div class=\"common-container\">\r\n  <div class=\"container\">\r\n    <div class=\"row\">\r\n      <div class=\"col-md-6\">\r\n        <h3>ULB Data Bulk Entry</h3>\r\n      </div>\r\n      <div class=\"col-md-6\">\r\n        <button [routerLink]=\"['../list']\" class=\"right btn btn-primary\">Entry List</button>\r\n      </div>\r\n    </div>\r\n    <br />\r\n    <span>Note* : Current version supports bulk data entry for single year only</span>\r\n    <br />\r\n\r\n    <div class=\"row\">\r\n      <form [formGroup]=\"bulkEntryForm\" (ngSubmit)=\"upload()\">\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label>Financial Year</label>\r\n            <select formControlName=\"year\" class=\"form-control\">\r\n              <option *ngFor=\"let yr of years\" [ngValue]=\"yr\">{{ yr }}</option>\r\n            </select>\r\n          </div>\r\n        </div>\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label>Select files to upload</label>\r\n            <input id=\"cin\" name=\"cin\" type=\"file\" (change)=\"fileChangeEvent($event)\" placeholder=\"Upload a file...\"\r\n              multiple />\r\n          </div>\r\n        </div>\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <br />\r\n            <button type=\"submit\" class=\"btn btn-primary btn-s\"> Upload</button>\r\n          </div>\r\n        </div>\r\n      </form>\r\n    </div>\r\n    <br/><br/>\r\n\r\n    <div class=\"row\" *ngIf=\"uploadResult\">\r\n      <table style=\"width: 50%\">\r\n        <tr>\r\n          <th>Perticular</th>\r\n          <th>status</th>\r\n        </tr>\r\n        <tr *ngFor=\"let item of uploadResult\">\r\n          <td>{{item.msg}}</td>\r\n          <td>{{item.success}}</td>\r\n        </tr>\r\n      </table>\r\n    </div>\r\n  </div>\r\n\r\n</div>\r\n"

/***/ }),

/***/ "./src/app/dashboard/data-entry/bulk-entry/bulk-entry.component.scss":
/*!***************************************************************************!*\
  !*** ./src/app/dashboard/data-entry/bulk-entry/bulk-entry.component.scss ***!
  \***************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ""

/***/ }),

/***/ "./src/app/dashboard/data-entry/bulk-entry/bulk-entry.component.ts":
/*!*************************************************************************!*\
  !*** ./src/app/dashboard/data-entry/bulk-entry/bulk-entry.component.ts ***!
  \*************************************************************************/
/*! exports provided: BulkEntryComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BulkEntryComponent", function() { return BulkEntryComponent; });
/* harmony import */ var _data_entry_service__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./../data-entry.service */ "./src/app/dashboard/data-entry/data-entry.service.ts");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};



var BulkEntryComponent = /** @class */ (function () {
    function BulkEntryComponent(formBuilder, dataEntryService) {
        this.formBuilder = formBuilder;
        this.dataEntryService = dataEntryService;
        this.submitted = false;
        this.years = [];
        this.filesToUpload = [];
    }
    BulkEntryComponent.prototype.ngOnInit = function () {
        this.years = ['2015-16', '2016-17', '2017-18'];
        this.bulkEntryForm = this.formBuilder.group({
            year: [this.years[0], _angular_forms__WEBPACK_IMPORTED_MODULE_2__["Validators"].required],
        });
    };
    BulkEntryComponent.prototype.upload = function () {
        var _this = this;
        this.submitted = true;
        if (this.bulkEntryForm.invalid || !this.bulkEntryForm.get('year').value) {
            return false;
        }
        var formData = new FormData();
        var files = this.filesToUpload;
        console.log(files);
        formData.append('year', this.bulkEntryForm.get('year').value);
        for (var i = 0; i < files.length; i++) {
            formData.append("files", files[i], files[i]['name']);
        }
        console.log('form data variable :   ' + formData.toString());
        this.dataEntryService.bulkEntry(formData).subscribe(function (res) {
            if (res['success']) {
                _this.uploadResult = res['data'];
                alert('Upload summary is available below');
            }
        });
    };
    BulkEntryComponent.prototype.fileChangeEvent = function (fileInput) {
        this.filesToUpload = fileInput.target.files;
        //this.product.photo = fileInput.target.files[0]['name'];
    };
    BulkEntryComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
            selector: 'app-bulk-entry',
            template: __webpack_require__(/*! ./bulk-entry.component.html */ "./src/app/dashboard/data-entry/bulk-entry/bulk-entry.component.html"),
            styles: [__webpack_require__(/*! ./bulk-entry.component.scss */ "./src/app/dashboard/data-entry/bulk-entry/bulk-entry.component.scss")]
        }),
        __metadata("design:paramtypes", [_angular_forms__WEBPACK_IMPORTED_MODULE_2__["FormBuilder"], _data_entry_service__WEBPACK_IMPORTED_MODULE_0__["DataEntryService"]])
    ], BulkEntryComponent);
    return BulkEntryComponent;
}());



/***/ }),

/***/ "./src/app/dashboard/data-entry/data-entry.module.ts":
/*!***********************************************************!*\
  !*** ./src/app/dashboard/data-entry/data-entry.module.ts ***!
  \***********************************************************/
/*! exports provided: DataEntryModule */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DataEntryModule", function() { return DataEntryModule; });
/* harmony import */ var ag_grid_angular__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ag-grid-angular */ "./node_modules/ag-grid-angular/main.js");
/* harmony import */ var ag_grid_angular__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(ag_grid_angular__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_common__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/common */ "./node_modules/@angular/common/fesm5/common.js");
/* harmony import */ var _ledger_ledger_component__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./ledger/ledger.component */ "./src/app/dashboard/data-entry/ledger/ledger.component.ts");
/* harmony import */ var _dataentry_router__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./dataentry.router */ "./src/app/dashboard/data-entry/dataentry.router.ts");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
/* harmony import */ var _ledger_list_ledger_list_component__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./ledger-list/ledger-list.component */ "./src/app/dashboard/data-entry/ledger-list/ledger-list.component.ts");
/* harmony import */ var _bulk_entry_bulk_entry_component__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./bulk-entry/bulk-entry.component */ "./src/app/dashboard/data-entry/bulk-entry/bulk-entry.component.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};








var DataEntryModule = /** @class */ (function () {
    function DataEntryModule() {
    }
    DataEntryModule = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["NgModule"])({
            imports: [
                _angular_common__WEBPACK_IMPORTED_MODULE_2__["CommonModule"],
                _dataentry_router__WEBPACK_IMPORTED_MODULE_4__["DataEntryRouter"],
                _angular_forms__WEBPACK_IMPORTED_MODULE_5__["ReactiveFormsModule"],
                ag_grid_angular__WEBPACK_IMPORTED_MODULE_0__["AgGridModule"].withComponents([])
            ],
            declarations: [_ledger_ledger_component__WEBPACK_IMPORTED_MODULE_3__["LedgerComponent"], _ledger_list_ledger_list_component__WEBPACK_IMPORTED_MODULE_6__["LedgerListComponent"], _bulk_entry_bulk_entry_component__WEBPACK_IMPORTED_MODULE_7__["BulkEntryComponent"]]
        })
    ], DataEntryModule);
    return DataEntryModule;
}());



/***/ }),

/***/ "./src/app/dashboard/data-entry/dataentry.router.ts":
/*!**********************************************************!*\
  !*** ./src/app/dashboard/data-entry/dataentry.router.ts ***!
  \**********************************************************/
/*! exports provided: dataEntryRouter, DataEntryRouter */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "dataEntryRouter", function() { return dataEntryRouter; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DataEntryRouter", function() { return DataEntryRouter; });
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/router */ "./node_modules/@angular/router/fesm5/router.js");
/* harmony import */ var _ledger_ledger_component__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ledger/ledger.component */ "./src/app/dashboard/data-entry/ledger/ledger.component.ts");
/* harmony import */ var _ledger_list_ledger_list_component__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ledger-list/ledger-list.component */ "./src/app/dashboard/data-entry/ledger-list/ledger-list.component.ts");
/* harmony import */ var _bulk_entry_bulk_entry_component__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./bulk-entry/bulk-entry.component */ "./src/app/dashboard/data-entry/bulk-entry/bulk-entry.component.ts");




var dataEntryRouter = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    { path: 'list', component: _ledger_list_ledger_list_component__WEBPACK_IMPORTED_MODULE_2__["LedgerListComponent"] },
    { path: 'ledger', component: _ledger_ledger_component__WEBPACK_IMPORTED_MODULE_1__["LedgerComponent"] },
    { path: 'bulk', component: _bulk_entry_bulk_entry_component__WEBPACK_IMPORTED_MODULE_3__["BulkEntryComponent"] },
];
var DataEntryRouter = _angular_router__WEBPACK_IMPORTED_MODULE_0__["RouterModule"].forChild(dataEntryRouter);


/***/ }),

/***/ "./src/app/dashboard/data-entry/ledger-list/ledger-list.component.html":
/*!*****************************************************************************!*\
  !*** ./src/app/dashboard/data-entry/ledger-list/ledger-list.component.html ***!
  \*****************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div class=\"common-container\">\r\n  <div class=\"container\">\r\n\r\n  <div class=\"row\">\r\n    <div class=\"col-md-6\">\r\n      <h3>ULB Data Entry List</h3>\r\n    </div>\r\n    <div class=\"col-md-6\">\r\n      <button [routerLink]=\"['../ledger']\" class=\"right btn btn-primary\" >New Entry</button>\r\n    </div>\r\n  </div>\r\n\r\n  <div class=\"row\">\r\n    <!-- {{ledgerLogs | json}} -->\r\n    <div class=\"col-md-12\">\r\n      <ag-grid-angular \r\n        style=\"width: 100%; height: 450px;\" \r\n        class=\"ag-theme-balham\"\r\n        [columnDefs]=\"columnDefs\"\r\n        [rowData]=\"ledgerLogs\" \r\n        [enableColResize]=\"true\"\r\n        [enableSorting]=\"true\"\r\n        [enableFilter]=\"true\"\r\n        [pagination]=\"true\"\r\n        [paginationAutoPageSize]=\"true\"\r\n      >\r\n</ag-grid-angular>\r\n    </div>\r\n  </div>\r\n\r\n\r\n</div>\r\n</div>"

/***/ }),

/***/ "./src/app/dashboard/data-entry/ledger-list/ledger-list.component.scss":
/*!*****************************************************************************!*\
  !*** ./src/app/dashboard/data-entry/ledger-list/ledger-list.component.scss ***!
  \*****************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ""

/***/ }),

/***/ "./src/app/dashboard/data-entry/ledger-list/ledger-list.component.ts":
/*!***************************************************************************!*\
  !*** ./src/app/dashboard/data-entry/ledger-list/ledger-list.component.ts ***!
  \***************************************************************************/
/*! exports provided: LedgerListComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "LedgerListComponent", function() { return LedgerListComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _data_entry_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../data-entry.service */ "./src/app/dashboard/data-entry/data-entry.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var LedgerListComponent = /** @class */ (function () {
    function LedgerListComponent(dataEntryService) {
        this.dataEntryService = dataEntryService;
        this.ledgerLogs = [];
        this.columnDefs = [
            { headerName: 'State', field: 'state' },
            { headerName: 'ULB', field: 'ulb' },
            { headerName: 'Year', field: 'year' },
            { headerName: 'Wards', field: 'wards', filter: "agNumberColumnFilter" },
            { headerName: 'Area', field: 'area', filter: "agNumberColumnFilter" },
            { headerName: 'Population', field: 'population', filter: "agNumberColumnFilter" },
            { headerName: 'Audit Status', field: 'audit_status' },
            { headerName: 'Audit Firm', field: 'audit_firm' },
            { headerName: 'Partner Name', field: 'partner_name' },
            { headerName: 'ICAI Membership#', field: 'icai_membership_number' },
            { headerName: 'Reverified At', field: 'reverified_at', filter: "agDateColumnFilter", valueFormatter: function (params) {
                    var date = new Date(parseInt(params.value));
                    return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getUTCFullYear();
                } },
            { headerName: 'Reverified By', field: 'reverified_by', filter: "agDateColumnFilter" },
        ];
    }
    LedgerListComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.dataEntryService.getLedgerLogs({}).subscribe(function (res) {
            if (res['success']) {
                _this.ledgerLogs = res['data'];
            }
            else {
                alert('Failed');
            }
        });
    };
    LedgerListComponent.prototype.onFirstDataRendered = function (params) {
        params.api.sizeColumnsToFit();
    };
    LedgerListComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-ledger-list',
            template: __webpack_require__(/*! ./ledger-list.component.html */ "./src/app/dashboard/data-entry/ledger-list/ledger-list.component.html"),
            styles: [__webpack_require__(/*! ./ledger-list.component.scss */ "./src/app/dashboard/data-entry/ledger-list/ledger-list.component.scss")]
        }),
        __metadata("design:paramtypes", [_data_entry_service__WEBPACK_IMPORTED_MODULE_1__["DataEntryService"]])
    ], LedgerListComponent);
    return LedgerListComponent;
}());



/***/ }),

/***/ "./src/app/dashboard/data-entry/ledger/ledger.component.html":
/*!*******************************************************************!*\
  !*** ./src/app/dashboard/data-entry/ledger/ledger.component.html ***!
  \*******************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div class=\"common-container\">\r\n  <div class=\"container\">\r\n  <div class=\"row\">\r\n    <div class=\"col-md-6\">\r\n      <h3>ULB Data Entry</h3>\r\n    </div>\r\n    <div class=\"col-md-6\">\r\n      <button [routerLink]=\"['../list']\" class=\"right btn btn-primary\">Entry List</button>\r\n      <button [routerLink]=\"['../bulk']\" class=\"right btn btn-primary\">Bulk Entry</button>\r\n    </div>\r\n  </div>\r\n  <div class=\"row\">\r\n      <form [formGroup]=\"ledgerForm\" (ngSubmit)=\"onSubmit()\">\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label>Financial Year</label>\r\n            <select formControlName=\"year\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.year.errors }\">\r\n              <option *ngFor=\"let yr of years\" [ngValue]=\"yr\">{{ yr }}</option>\r\n            </select>\r\n          </div>\r\n        </div>\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label>State</label>\r\n            <select formControlName=\"state\" (change)=\"loadUlbs()\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.state.errors }\">\r\n              <option *ngFor=\"let st of states\" [ngValue]=\"st\">{{ st.name }}</option>\r\n            </select>\r\n          </div>\r\n        </div>\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label>ULB</label>\r\n            <select formControlName=\"ulb\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.ulb.errors }\">\r\n              <option *ngFor=\"let ul of ulbs\" [ngValue]=\"ul\">{{ ul.name }}</option>\r\n            </select>\r\n          </div>\r\n        </div>\r\n        <!-- <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label># Wards</label>\r\n            <input type=\"text\" formControlName=\"wards\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.wards.errors }\" />\r\n            <div *ngIf=\"submitted && lf.wards.errors\" class=\"invalid-feedback\">\r\n              <div *ngIf=\"lf.wards.errors.required\"># Wards is required</div>\r\n            </div>\r\n          </div>\r\n        </div>\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label>Population</label>\r\n            <input type=\"text\" formControlName=\"population\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.population.errors }\" />\r\n            <div *ngIf=\"submitted && lf.population.errors\" class=\"invalid-feedback\">\r\n              <div *ngIf=\"lf.population.errors.required\">Population is required</div>\r\n            </div>\r\n          </div>\r\n        </div>\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label>Area (Sq Km)</label>\r\n            <input type=\"text\" formControlName=\"area\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.area.errors }\" />\r\n            <div *ngIf=\"submitted && lf.area.errors\" class=\"invalid-feedback\">\r\n              <div *ngIf=\"lf.area.errors.required\">Area is required</div>\r\n            </div>\r\n          </div>\r\n        </div> -->\r\n        <!-- <div class=\"col-md-12\">\r\n          <hr />\r\n        </div>\r\n        <div class=\"col-md-2\">\r\n          <div class=\"form-group\">\r\n            <label title=\"What are the possible audit status?\">Audit Status ?</label>\r\n            <input type=\"text\" formControlName=\"audit_status\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.audit_status.errors }\" />\r\n            <div *ngIf=\"submitted && lf.audit_status.errors\" class=\"invalid-feedback\">\r\n              <div *ngIf=\"lf.audit_status.errors.required\">Audit Status is required</div>\r\n            </div>\r\n          </div>\r\n        </div>\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label>Audit Firm Name</label>\r\n            <input type=\"text\" formControlName=\"audit_firm\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.audit_firm.errors }\" />\r\n            <div *ngIf=\"submitted && lf.audit_firm.errors\" class=\"invalid-feedback\">\r\n              <div *ngIf=\"lf.audit_firm.errors.required\">Audit Firm is required</div>\r\n            </div>\r\n          </div>\r\n        </div>\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label>Partner Name</label>\r\n            <input type=\"text\" formControlName=\"partner_name\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.partner_name.errors }\" />\r\n            <div *ngIf=\"submitted && lf.partner_name.errors\" class=\"invalid-feedback\">\r\n              <div *ngIf=\"lf.partner_name.errors.required\">Partner Name is required</div>\r\n            </div>\r\n          </div>\r\n        </div>\r\n        <div class=\"col-md-2\">\r\n          <div class=\"form-group\">\r\n            <label>ICAI Membership #</label>\r\n            <input type=\"text\" formControlName=\"icai_membership_number\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.icai_membership_number.errors }\" />\r\n            <div *ngIf=\"submitted && lf.icai_membership_number.errors\" class=\"invalid-feedback\">\r\n              <div *ngIf=\"lf.icai_membership_number.errors.required\">ICAI Membership Number is required</div>\r\n            </div>\r\n          </div>\r\n        </div>\r\n        <div class=\"col-md-12\">\r\n          <hr />\r\n        </div>\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label title=\"is this the data entry date on this application? OR the date of data capture\">Date of Entry ?</label>\r\n            <input type=\"date\" formControlName=\"created_at\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.created_at.errors }\" />\r\n            <div *ngIf=\"submitted && lf.created_at.errors\" class=\"invalid-feedback\">\r\n              <div *ngIf=\"lf.created_at.errors.required\">Date of entry is required</div>\r\n            </div>\r\n          </div>\r\n        </div>\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label title=\"is this the user who is entering data on this application? OR the person who capture this data offline\">Entered\r\n              by ?</label>\r\n            <input type=\"text\" formControlName=\"created_by\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.created_by.errors }\" />\r\n            <div *ngIf=\"submitted && lf.created_by.errors\" class=\"invalid-feedback\">\r\n              <div *ngIf=\"lf.created_by.errors.required\">Entered by user is required</div>\r\n            </div>\r\n          </div>\r\n        </div>\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label>Date of verification</label>\r\n            <input type=\"date\" formControlName=\"verified_at\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.verified_at.errors }\" />\r\n            <div *ngIf=\"submitted && lf.verified_at.errors\" class=\"invalid-feedback\">\r\n              <div *ngIf=\"lf.verified_at.errors.required\">Verified at date is required</div>\r\n            </div>\r\n          </div>\r\n        </div>\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label>Verified by</label>\r\n            <input type=\"text\" formControlName=\"verified_by\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.verified_by.errors }\" />\r\n            <div *ngIf=\"submitted && lf.verified_by.errors\" class=\"invalid-feedback\">\r\n              <div *ngIf=\"lf.verified_by.errors.required\">Verified by user is required</div>\r\n            </div>\r\n          </div>\r\n        </div>\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label>Date of Re-verification</label>\r\n            <input type=\"date\" formControlName=\"reverified_at\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.reverified_at.errors }\" />\r\n            <div *ngIf=\"submitted && lf.reverified_at.errors\" class=\"invalid-feedback\">\r\n              <div *ngIf=\"lf.reverified_at.errors.required\">Date of reverified is required</div>\r\n            </div>\r\n          </div>\r\n        </div>\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label>Re-verified by</label>\r\n            <input type=\"text\" formControlName=\"reverified_by\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.reverified_by.errors }\" />\r\n            <div *ngIf=\"submitted && lf.reverified_by.errors\" class=\"invalid-feedback\">\r\n              <div *ngIf=\"lf.reverified_by.errors.required\">Reverified by user is required</div>\r\n            </div>\r\n          </div>\r\n        </div> -->\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <label>Upload Data Sheet</label>\r\n            <input type=\"file\" #fileInput formControlName=\"file\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && lf.file.errors }\" />\r\n            <div *ngIf=\"submitted && lf.file.errors\" class=\"invalid-feedback\">\r\n              <div *ngIf=\"lf.file.errors.required\">Data entry file is required</div>\r\n            </div>\r\n          </div>\r\n        </div>\r\n        <div class=\"col-md-4\">\r\n          <div class=\"form-group\">\r\n            <br />\r\n            <button class=\"btn btn-primary\">Submit Entry</button>\r\n          </div>\r\n        </div>\r\n\r\n      </form>\r\n  </div>\r\n</div>\r\n</div>"

/***/ }),

/***/ "./src/app/dashboard/data-entry/ledger/ledger.component.scss":
/*!*******************************************************************!*\
  !*** ./src/app/dashboard/data-entry/ledger/ledger.component.scss ***!
  \*******************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "hr {\n  margin-top: 10px;\n  margin-bottom: 10px; }\n\nbutton.right {\n  margin: auto 5px; }\n"

/***/ }),

/***/ "./src/app/dashboard/data-entry/ledger/ledger.component.ts":
/*!*****************************************************************!*\
  !*** ./src/app/dashboard/data-entry/ledger/ledger.component.ts ***!
  \*****************************************************************/
/*! exports provided: LedgerComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "LedgerComponent", function() { return LedgerComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
/* harmony import */ var _shared_services_common_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../shared/services/common.service */ "./src/app/shared/services/common.service.ts");
/* harmony import */ var _data_entry_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../data-entry.service */ "./src/app/dashboard/data-entry/data-entry.service.ts");
/* harmony import */ var _shared_services_utility_service__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../../shared/services/utility.service */ "./src/app/shared/services/utility.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};





var LedgerComponent = /** @class */ (function () {
    function LedgerComponent(formBuilder, commonService, dataEntryService, utilService) {
        this.formBuilder = formBuilder;
        this.commonService = commonService;
        this.dataEntryService = dataEntryService;
        this.utilService = utilService;
        this.states = [];
        this.years = [];
        this.ulbs = [];
        this.submitted = false;
    }
    LedgerComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.years = ['2015-16', '2016-17', '2017-18'];
        // this.ledgerForm = this.formBuilder.group({
        //   state: ['', Validators.required],
        //   ulb: ['', Validators.required],
        //   year: [this.years[0], Validators.required],	
        //   wards: ['', Validators.required],	
        //   population: ['', Validators.required],	
        //   area: ['', Validators.required],	
        //   audit_status: ['', Validators.required],
        //   audit_firm: ['', Validators.required],
        //   partner_name: ['', Validators.required],
        //   icai_membership_number: ['', Validators.required],
        //   created_at: ['', Validators.required],
        //   created_by: ['', Validators.required],
        //   verified_at: ['', Validators.required],
        //   verified_by: ['', Validators.required],
        //   reverified_at: ['', Validators.required],
        //   reverified_by: ['', Validators.required],
        //   file: [null, Validators.required]
        // });
        this.ledgerForm = this.formBuilder.group({
            state: ['', _angular_forms__WEBPACK_IMPORTED_MODULE_1__["Validators"].required],
            ulb: ['', _angular_forms__WEBPACK_IMPORTED_MODULE_1__["Validators"].required],
            year: [this.years[0], _angular_forms__WEBPACK_IMPORTED_MODULE_1__["Validators"].required],
            file: [null, _angular_forms__WEBPACK_IMPORTED_MODULE_1__["Validators"].required]
        });
        this.commonService.states.subscribe(function (res) {
            _this.states = res;
            _this.ledgerForm.value.state = _this.states[0];
        });
        this.commonService.loadStates(false);
    };
    Object.defineProperty(LedgerComponent.prototype, "lf", {
        get: function () {
            return this.ledgerForm.controls;
        },
        enumerable: true,
        configurable: true
    });
    LedgerComponent.prototype.loadUlbs = function () {
        var _this = this;
        if (this.ledgerForm.value.state && this.ledgerForm.value.state.code) {
            this.commonService.getUlbByState(this.ledgerForm.value.state.code).subscribe(function (res) {
                _this.ulbs = res['data']['ulbs'];
                _this.ledgerForm.value.ulb = _this.ulbs[0];
            });
        }
    };
    LedgerComponent.prototype.onSubmit = function () {
        var _this = this;
        this.submitted = true;
        // stop here if form is invalid
        var file = this.fileInput.nativeElement;
        if (this.ledgerForm.invalid || !(file.files && file.files[0])) {
            return;
        }
        var formData = this.utilService.jsonToFormData(this.ledgerForm.value, ['file', 'state', 'ulb'], new FormData());
        formData.append('file', file.files[0]);
        formData.append('stateCode', this.ledgerForm.value.state.code);
        formData.append('stateName', this.ledgerForm.value.state.name);
        formData.append('ulbCode', this.ledgerForm.value.ulb.code);
        formData.append('ulbName', this.ledgerForm.value.ulb.name);
        formData.append('wards', this.ledgerForm.value.ulb.wards);
        formData.append('population', this.ledgerForm.value.ulb.population);
        formData.append('area', this.ledgerForm.value.ulb.area);
        this.dataEntryService.createEntry(formData).subscribe(function (res) {
            if (res['success']) {
                alert('Successfully added');
                _this.submitted = false;
                // this.ledgerForm.reset();
            }
            else {
                alert(res['msg']);
            }
        });
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])("fileInput"),
        __metadata("design:type", Object)
    ], LedgerComponent.prototype, "fileInput", void 0);
    LedgerComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-ledger',
            template: __webpack_require__(/*! ./ledger.component.html */ "./src/app/dashboard/data-entry/ledger/ledger.component.html"),
            styles: [__webpack_require__(/*! ./ledger.component.scss */ "./src/app/dashboard/data-entry/ledger/ledger.component.scss")]
        }),
        __metadata("design:paramtypes", [_angular_forms__WEBPACK_IMPORTED_MODULE_1__["FormBuilder"], _shared_services_common_service__WEBPACK_IMPORTED_MODULE_2__["CommonService"],
            _data_entry_service__WEBPACK_IMPORTED_MODULE_3__["DataEntryService"], _shared_services_utility_service__WEBPACK_IMPORTED_MODULE_4__["UtilityService"]])
    ], LedgerComponent);
    return LedgerComponent;
}());



/***/ }),

/***/ "./src/app/shared/services/common.service.ts":
/*!***************************************************!*\
  !*** ./src/app/shared/services/common.service.ts ***!
  \***************************************************/
/*! exports provided: CommonService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CommonService", function() { return CommonService; });
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_common_http__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/common/http */ "./node_modules/@angular/common/fesm5/http.js");
/* harmony import */ var _environments_environment__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./../../../environments/environment */ "./src/environments/environment.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};




var CommonService = /** @class */ (function () {
    // private states: any = [];
    function CommonService(http) {
        this.http = http;
        this.stateArr = [];
        this.states = new rxjs__WEBPACK_IMPORTED_MODULE_0__["Subject"]();
    }
    // we are loading states while loading dashboard
    CommonService.prototype.loadStates = function (doLoadFromServer) {
        var _this = this;
        if (this.stateArr.length > 0 && !doLoadFromServer) {
            this.states.next(this.stateArr);
        }
        this.http.get(_environments_environment__WEBPACK_IMPORTED_MODULE_3__["environment"].api.url + 'lookup/states').subscribe(function (res) {
            _this.stateArr = res['data'];
            _this.states.next(_this.stateArr);
        });
    };
    CommonService.prototype.getAllUlbs = function () {
        return this.http.get(_environments_environment__WEBPACK_IMPORTED_MODULE_3__["environment"].api.url + 'lookup/ulbs');
    };
    // since ULB is based on state, query will happen on demand
    CommonService.prototype.getUlbByState = function (stateCode) {
        return this.http.get(_environments_environment__WEBPACK_IMPORTED_MODULE_3__["environment"].api.url + 'lookup/states/' + stateCode + '/ulbs');
    };
    CommonService.prototype.loadStatesAgg = function () {
        return this.http.get("/assets/files/homeDashboardStateAggData.json");
    };
    CommonService.prototype.loadHomeStatisticsData = function () {
        return this.http.get("/assets/files/homeDashboardData.json");
    };
    CommonService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Injectable"])({
            providedIn: 'root'
        }),
        __metadata("design:paramtypes", [_angular_common_http__WEBPACK_IMPORTED_MODULE_2__["HttpClient"]])
    ], CommonService);
    return CommonService;
}());



/***/ }),

/***/ "./src/app/shared/services/utility.service.ts":
/*!****************************************************!*\
  !*** ./src/app/shared/services/utility.service.ts ***!
  \****************************************************/
/*! exports provided: UtilityService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "UtilityService", function() { return UtilityService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var UtilityService = /** @class */ (function () {
    function UtilityService() {
    }
    UtilityService.prototype.jsonToFormData = function (jsonObj, ignoreKeys, formData) {
        // let formData: FormData = new FormData();
        var keys = Object.keys(jsonObj);
        for (var i = 0; i < keys.length; i++) {
            if (ignoreKeys.indexOf(keys[i]) > -1) {
                continue;
            }
            formData.append(keys[i], jsonObj[keys[i]]);
        }
        return formData;
    };
    UtilityService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])({
            providedIn: 'root'
        }),
        __metadata("design:paramtypes", [])
    ], UtilityService);
    return UtilityService;
}());



/***/ })

}]);
//# sourceMappingURL=data-entry-data-entry-module.js.map