(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["dashboard-dashboard-module"],{

/***/ "./src/app/dashboard/dashboard.module.ts":
/*!***********************************************!*\
  !*** ./src/app/dashboard/dashboard.module.ts ***!
  \***********************************************/
/*! exports provided: DashboardModule */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DashboardModule", function() { return DashboardModule; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_common__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/common */ "./node_modules/@angular/common/fesm5/common.js");
/* harmony import */ var _dashboard_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./dashboard.router */ "./src/app/dashboard/dashboard.router.ts");
/* harmony import */ var _header_header_component__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./header/header.component */ "./src/app/dashboard/header/header.component.ts");
/* harmony import */ var _dashboard_dashboard_component__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./dashboard/dashboard.component */ "./src/app/dashboard/dashboard/dashboard.component.ts");
/* harmony import */ var _shared_services_common_service__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../shared/services/common.service */ "./src/app/shared/services/common.service.ts");
/* harmony import */ var _data_tracker_data_tracker_component__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./data-tracker/data-tracker.component */ "./src/app/dashboard/data-tracker/data-tracker.component.ts");
/* harmony import */ var ag_grid_angular__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ag-grid-angular */ "./node_modules/ag-grid-angular/main.js");
/* harmony import */ var ag_grid_angular__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(ag_grid_angular__WEBPACK_IMPORTED_MODULE_7__);
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};








// import { TestComponent } from './test/test.component';

var DashboardModule = /** @class */ (function () {
    function DashboardModule() {
    }
    DashboardModule = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["NgModule"])({
            imports: [
                _angular_common__WEBPACK_IMPORTED_MODULE_1__["CommonModule"],
                _dashboard_router__WEBPACK_IMPORTED_MODULE_2__["DashboardRouter"],
                ag_grid_angular__WEBPACK_IMPORTED_MODULE_7__["AgGridModule"].withComponents([]),
                _angular_forms__WEBPACK_IMPORTED_MODULE_8__["ReactiveFormsModule"]
            ],
            providers: [
                _shared_services_common_service__WEBPACK_IMPORTED_MODULE_5__["CommonService"]
            ],
            declarations: [_header_header_component__WEBPACK_IMPORTED_MODULE_3__["HeaderComponent"], _dashboard_dashboard_component__WEBPACK_IMPORTED_MODULE_4__["DashboardComponent"], _data_tracker_data_tracker_component__WEBPACK_IMPORTED_MODULE_6__["DataTrackerComponent"],
            ]
        })
    ], DashboardModule);
    return DashboardModule;
}());



/***/ }),

/***/ "./src/app/dashboard/dashboard.router.ts":
/*!***********************************************!*\
  !*** ./src/app/dashboard/dashboard.router.ts ***!
  \***********************************************/
/*! exports provided: dashboardRouter, DashboardRouter */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "dashboardRouter", function() { return dashboardRouter; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DashboardRouter", function() { return DashboardRouter; });
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/router */ "./node_modules/@angular/router/fesm5/router.js");
/* harmony import */ var _security_auth_guard_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../security/auth-guard.service */ "./src/app/security/auth-guard.service.ts");
/* harmony import */ var _dashboard_dashboard_component__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./dashboard/dashboard.component */ "./src/app/dashboard/dashboard/dashboard.component.ts");
/* harmony import */ var _data_tracker_data_tracker_component__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./data-tracker/data-tracker.component */ "./src/app/dashboard/data-tracker/data-tracker.component.ts");




// import { TestComponent } from './test/test.component';
var dashboardRouter = [
    {
        path: '', component: _dashboard_dashboard_component__WEBPACK_IMPORTED_MODULE_2__["DashboardComponent"],
        children: [
            { path: '', redirectTo: 'user', pathMatch: 'full' },
            { path: 'user', loadChildren: './user/user.module#UserModule', canActivate: [_security_auth_guard_service__WEBPACK_IMPORTED_MODULE_1__["AuthGuard"]] },
            { path: 'entry', loadChildren: './data-entry/data-entry.module#DataEntryModule', canActivate: [_security_auth_guard_service__WEBPACK_IMPORTED_MODULE_1__["AuthGuard"]] },
            { path: 'report', loadChildren: './report/report.module#ReportModule' },
            { path: 'data-tracker', component: _data_tracker_data_tracker_component__WEBPACK_IMPORTED_MODULE_3__["DataTrackerComponent"] },
        ]
    }
];
var DashboardRouter = _angular_router__WEBPACK_IMPORTED_MODULE_0__["RouterModule"].forChild(dashboardRouter);


/***/ }),

/***/ "./src/app/dashboard/dashboard/dashboard.component.html":
/*!**************************************************************!*\
  !*** ./src/app/dashboard/dashboard/dashboard.component.html ***!
  \**************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div class=\"dashboard-wrapper\">\r\n  <app-header></app-header>\r\n  <router-outlet></router-outlet>\r\n</div>\r\n"

/***/ }),

/***/ "./src/app/dashboard/dashboard/dashboard.component.scss":
/*!**************************************************************!*\
  !*** ./src/app/dashboard/dashboard/dashboard.component.scss ***!
  \**************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ".dashboard-wrapper {\n  background-color: white;\n  min-height: 650px; }\n"

/***/ }),

/***/ "./src/app/dashboard/dashboard/dashboard.component.ts":
/*!************************************************************!*\
  !*** ./src/app/dashboard/dashboard/dashboard.component.ts ***!
  \************************************************************/
/*! exports provided: DashboardComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DashboardComponent", function() { return DashboardComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _shared_services_common_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../shared/services/common.service */ "./src/app/shared/services/common.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var DashboardComponent = /** @class */ (function () {
    function DashboardComponent(commonService) {
        this.commonService = commonService;
    }
    DashboardComponent.prototype.ngOnInit = function () {
        this.commonService.loadStates(true);
    };
    DashboardComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-dashboard',
            template: __webpack_require__(/*! ./dashboard.component.html */ "./src/app/dashboard/dashboard/dashboard.component.html"),
            styles: [__webpack_require__(/*! ./dashboard.component.scss */ "./src/app/dashboard/dashboard/dashboard.component.scss")]
        }),
        __metadata("design:paramtypes", [_shared_services_common_service__WEBPACK_IMPORTED_MODULE_1__["CommonService"]])
    ], DashboardComponent);
    return DashboardComponent;
}());



/***/ }),

/***/ "./src/app/dashboard/data-tracker/data-tracker.component.html":
/*!********************************************************************!*\
  !*** ./src/app/dashboard/data-tracker/data-tracker.component.html ***!
  \********************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div class=\"common-container\">\r\n  <div class=\"container\">\r\n\r\n    <div class=\"row\">\r\n      <div class=\"col-md-6\">\r\n        <h3>Urban Finance </h3> <h4>The list of files available on city finance. </h4>\r\n      </div>\r\n    </div>\r\n\r\n    <div class=\"row\">\r\n      <div class=\"col-md-12\">\r\n        <ag-grid-angular style=\"width: 100%; height: calc(100vh - 230px);\" class=\"ag-theme-balham\" [columnDefs]=\"columnDefs\"\r\n          [rowData]=\"ledgerLogs\" [enableColResize]=\"true\" [enableSorting]=\"true\" [enableFilter]=\"true\" [pagination]=\"true\"\r\n          [paginationAutoPageSize]=\"true\" (gridReady)=\"onFirstDataRendered($event)\">\r\n        </ag-grid-angular>\r\n      </div>\r\n    </div>\r\n\r\n\r\n  </div>\r\n</div>\r\n"

/***/ }),

/***/ "./src/app/dashboard/data-tracker/data-tracker.component.scss":
/*!********************************************************************!*\
  !*** ./src/app/dashboard/data-tracker/data-tracker.component.scss ***!
  \********************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ""

/***/ }),

/***/ "./src/app/dashboard/data-tracker/data-tracker.component.ts":
/*!******************************************************************!*\
  !*** ./src/app/dashboard/data-tracker/data-tracker.component.ts ***!
  \******************************************************************/
/*! exports provided: DataTrackerComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DataTrackerComponent", function() { return DataTrackerComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _data_entry_data_entry_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../data-entry/data-entry.service */ "./src/app/dashboard/data-entry/data-entry.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var DataTrackerComponent = /** @class */ (function () {
    function DataTrackerComponent(dataEntryService) {
        this.dataEntryService = dataEntryService;
        this.ledgerLogs = [];
        this.columnDefs = [
            { headerName: 'State', field: 'state' },
            { headerName: 'ULB Name', field: 'ulb' },
            { headerName: 'Year', field: 'year' },
            // {headerName: 'Wards', field: 'wards', filter: "agNumberColumnFilter" },
            // {headerName: 'Area', field: 'area', filter: "agNumberColumnFilter" },
            // {headerName: 'Population', field: 'population', filter: "agNumberColumnFilter" },
            { headerName: 'Audit Status', field: 'audit_status' },
            { headerName: 'Download', field: 'ulb_code_year',
                cellRenderer: function (params) {
                    return '<a href="https://jccd-cityfinance.s3.ap-south-1.amazonaws.com/downloads/credit-rating/excel/' + params.value.substr(0, 6) + params.value.substr(8, 2) + params.value.substr(11, 2) + '.xlsx' + '" target="_blank"><i class="fa fa-file-excel-o" aria-hidden="true"></i></a> / <a href="https://jccd-cityfinance.s3.ap-south-1.amazonaws.com/downloads/credit-rating/pdf/' + params.value.substr(0, 6) + params.value.substr(8, 2) + params.value.substr(11, 2) + '.pdf' + '" target="_blank"><i class="fa fa-file-pdf-o" aria-hidden="true"></i></a>';
                }
            },
        ];
    }
    DataTrackerComponent.prototype.ngOnInit = function () {
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
    DataTrackerComponent.prototype.onFirstDataRendered = function (params) {
        params.api.sizeColumnsToFit();
    };
    DataTrackerComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-data-tracker',
            template: __webpack_require__(/*! ./data-tracker.component.html */ "./src/app/dashboard/data-tracker/data-tracker.component.html"),
            styles: [__webpack_require__(/*! ./data-tracker.component.scss */ "./src/app/dashboard/data-tracker/data-tracker.component.scss")]
        }),
        __metadata("design:paramtypes", [_data_entry_data_entry_service__WEBPACK_IMPORTED_MODULE_1__["DataEntryService"]])
    ], DataTrackerComponent);
    return DataTrackerComponent;
}());



/***/ }),

/***/ "./src/app/dashboard/header/header.component.html":
/*!********************************************************!*\
  !*** ./src/app/dashboard/header/header.component.html ***!
  \********************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<nav class=\"navbar\">\r\n  <div class=\"container-fluid\">\r\n    <div class=\"navbar-header\">\r\n      <span [routerLink]=\"['/']\" class=\"navbar-brand\"><img src=\"/assets/images/cityfinance-logo.png\"></span>\r\n    </div>\r\n    <!-- Home, About Cityfinance.in, Urban Finances, Municipal Finance Laws, Credit Rating , Municipal Bonds and Login -->\r\n    <ul class=\"nav navbar-nav navbar-right\">\r\n      <li routerLinkActive=\"active\"><a [routerLink]=\"['/home']\">Home</a></li>\r\n      <!-- <li routerLinkActive=\"active\"><a [routerLink]=\"['/home']\">About Cityfinance.in</a></li> -->\r\n      <li routerLinkActive=\"active\"><a [routerLink]=\"['/dashboard/report']\">Urban Finances</a></li>\r\n      <li routerLinkActive=\"active\"><a [routerLink]=\"['/credit-rating/laws']\">Municipal Finance Laws</a></li>\r\n      <li routerLinkActive=\"active\"><a [routerLink]=\"['/credit-rating/report']\">Credit Rating</a></li>\r\n      <li routerLinkActive=\"active\"><a [routerLink]=\"['/credit-rating/municipal-bond']\">Municipal Bonds</a></li>\r\n      <li routerLinkActive=\"active\" *ngIf=\"!isLoggedIn\"><a [routerLink]=\"['/login']\">Login</a></li>\r\n      <li routerLinkActive=\"active\" class=\"dropdown\" *ngIf=\"isLoggedIn\">\r\n        <a  class=\"dropdown-toggle\" data-toggle=\"dropdown\" role=\"button\" aria-haspopup=\"true\" aria-expanded=\"false\">Settings &nbsp;<span class=\"caret\"></span></a>\r\n        <ul class=\"dropdown-menu\">\r\n          <li routerLinkActive=\"active\"><a [routerLink]=\"['user']\">Profile</a></li>\r\n          <li routerLinkActive=\"active\"><a class=\"pointer\" (click)=\"logout()\">Logout</a></li>\r\n        </ul>\r\n      </li>\r\n\r\n      <!-- <li class=\"dropdown\">\r\n        <a  class=\"dropdown-toggle\" data-toggle=\"dropdown\" role=\"button\" aria-haspopup=\"true\" aria-expanded=\"false\">Ulb Credit Rating &nbsp;<span class=\"caret\"></span></a>\r\n        <ul class=\"dropdown-menu\">\r\n          <li><a [routerLink]=\"['/credit-rating/report']\">Credit Rating Report</a></li>\r\n          <li><a [routerLink]=\"['/credit-rating/laws']\">Municipal Laws</a></li>\r\n          <li><a [routerLink]=\"['/credit-rating/municipal-bond']\">Municipal Bond Issuances</a></li>\r\n        </ul>\r\n      </li>\r\n      <li><a [routerLink]=\"['/dashboard/data-tracker']\">Data Tracker</a></li>\r\n      <li *ngIf=\"isLoggedIn\"><a [routerLink]=\"['entry']\">Data Entry</a></li>\r\n      <li *ngIf=\"isLoggedIn\"><a [routerLink]=\"['report']\">Report</a></li> -->\r\n      \r\n    </ul>\r\n  </div>\r\n</nav>"

/***/ }),

/***/ "./src/app/dashboard/header/header.component.scss":
/*!********************************************************!*\
  !*** ./src/app/dashboard/header/header.component.scss ***!
  \********************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ""

/***/ }),

/***/ "./src/app/dashboard/header/header.component.ts":
/*!******************************************************!*\
  !*** ./src/app/dashboard/header/header.component.ts ***!
  \******************************************************/
/*! exports provided: HeaderComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "HeaderComponent", function() { return HeaderComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/router */ "./node_modules/@angular/router/fesm5/router.js");
/* harmony import */ var _auth_auth_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../auth/auth.service */ "./src/app/auth/auth.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};



var HeaderComponent = /** @class */ (function () {
    function HeaderComponent(router, authService) {
        this.router = router;
        this.authService = authService;
        this.isLoggedIn = false;
    }
    HeaderComponent.prototype.ngOnInit = function () {
        this.isLoggedIn = this.authService.loggedIn();
    };
    HeaderComponent.prototype.logout = function () {
        localStorage.clear();
        this.router.navigate(['/']);
        this.isLoggedIn = false;
    };
    HeaderComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-header',
            template: __webpack_require__(/*! ./header.component.html */ "./src/app/dashboard/header/header.component.html"),
            styles: [__webpack_require__(/*! ./header.component.scss */ "./src/app/dashboard/header/header.component.scss")]
        }),
        __metadata("design:paramtypes", [_angular_router__WEBPACK_IMPORTED_MODULE_1__["Router"], _auth_auth_service__WEBPACK_IMPORTED_MODULE_2__["AuthService"]])
    ], HeaderComponent);
    return HeaderComponent;
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



/***/ })

}]);
//# sourceMappingURL=dashboard-dashboard-module.js.map