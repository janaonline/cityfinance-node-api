(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["user-user-module"],{

/***/ "./src/app/dashboard/user/onboard-user/onboard-user.component.html":
/*!*************************************************************************!*\
  !*** ./src/app/dashboard/user/onboard-user/onboard-user.component.html ***!
  \*************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div class=\"common-container\">\r\n  <div class=\"container\">\r\n  <div class=\"row\">\r\n    <div class=\"col-md-6\">\r\n      <h3>Onboard User</h3>\r\n    </div>\r\n    <div class=\"col-md-6\">\r\n      <button [routerLink]=\"['../list']\" class=\"right btn btn-primary\">User List</button>\r\n    </div>\r\n  </div>\r\n  <div class=\"row\">\r\n    <div class=\"col-md-6\">\r\n      <form [formGroup]=\"userOnboardForm\" (ngSubmit)=\"onboard()\">\r\n        <div class=\"form-group\">\r\n          <label>Name</label>\r\n          <input type=\"text\" formControlName=\"name\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && f.name.errors }\" />\r\n          <div *ngIf=\"submitted && f.name.errors\" class=\"invalid-feedback\">\r\n            <div *ngIf=\"f.name.errors.required\">Name is required</div>\r\n          </div>\r\n        </div>\r\n        <div class=\"form-group\">\r\n          <label>Role</label>\r\n          <select name=\"role\" formControlName=\"role\" class=\"form-control\" >\r\n            <option value=\"USER\">User</option>\r\n            <option value=\"ADMIN\">Admin</option>\r\n            <option value=\"SUPERADMIN\">Super Admin</option>\r\n          </select>\r\n        </div>\r\n        <div class=\"form-group\">\r\n          <label>Mobile</label>\r\n          <input type=\"text\" formControlName=\"mobile\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && f.mobile.errors }\" />\r\n        </div>\r\n        <div class=\"form-group\">\r\n          <label>Email</label>\r\n          <input type=\"text\" formControlName=\"email\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && f.email.errors }\" />\r\n          <div *ngIf=\"submitted && f.email.errors\" class=\"invalid-feedback\">\r\n            <div *ngIf=\"f.email.errors.required\">Email is required</div>\r\n            <div *ngIf=\"f.email.errors.email\">Email must be a valid email address</div>\r\n          </div>\r\n        </div>\r\n        <div class=\"form-group\">\r\n          <label>password</label>\r\n          <input type=\"password\" formControlName=\"password\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && f.password.errors }\" />\r\n        </div>\r\n        <div class=\"form-group\">\r\n          <button class=\"btn btn-primary\">Onboard</button>\r\n        </div>\r\n      </form>\r\n\r\n    </div>\r\n  </div>\r\n</div>\r\n</div>"

/***/ }),

/***/ "./src/app/dashboard/user/onboard-user/onboard-user.component.scss":
/*!*************************************************************************!*\
  !*** ./src/app/dashboard/user/onboard-user/onboard-user.component.scss ***!
  \*************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ""

/***/ }),

/***/ "./src/app/dashboard/user/onboard-user/onboard-user.component.ts":
/*!***********************************************************************!*\
  !*** ./src/app/dashboard/user/onboard-user/onboard-user.component.ts ***!
  \***********************************************************************/
/*! exports provided: OnboardUserComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "OnboardUserComponent", function() { return OnboardUserComponent; });
/* harmony import */ var _user_service__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./../user.service */ "./src/app/dashboard/user/user.service.ts");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/router */ "./node_modules/@angular/router/fesm5/router.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};




var OnboardUserComponent = /** @class */ (function () {
    function OnboardUserComponent(fb, userService, router) {
        this.fb = fb;
        this.userService = userService;
        this.router = router;
        this.submitted = false;
    }
    OnboardUserComponent.prototype.ngOnInit = function () {
        this.userOnboardForm = this.fb.group({
            name: ['', _angular_forms__WEBPACK_IMPORTED_MODULE_2__["Validators"].required],
            mobile: ['', []],
            email: ['', [_angular_forms__WEBPACK_IMPORTED_MODULE_2__["Validators"].required, _angular_forms__WEBPACK_IMPORTED_MODULE_2__["Validators"].email]],
            password: ['', _angular_forms__WEBPACK_IMPORTED_MODULE_2__["Validators"].required],
            role: ['', [_angular_forms__WEBPACK_IMPORTED_MODULE_2__["Validators"].required]]
        });
    };
    Object.defineProperty(OnboardUserComponent.prototype, "f", {
        get: function () {
            return this.userOnboardForm.controls;
        },
        enumerable: true,
        configurable: true
    });
    OnboardUserComponent.prototype.onboard = function () {
        this.submitted = true;
        if (!this.userOnboardForm.valid) {
            return false;
        }
        this.userService.onboard(this.userOnboardForm.value).subscribe(function (res) {
            console.log(res);
            if (res['success']) {
                alert('User Onboarded');
            }
        });
    };
    OnboardUserComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
            selector: 'app-onboard-user',
            template: __webpack_require__(/*! ./onboard-user.component.html */ "./src/app/dashboard/user/onboard-user/onboard-user.component.html"),
            styles: [__webpack_require__(/*! ./onboard-user.component.scss */ "./src/app/dashboard/user/onboard-user/onboard-user.component.scss")]
        }),
        __metadata("design:paramtypes", [_angular_forms__WEBPACK_IMPORTED_MODULE_2__["FormBuilder"], _user_service__WEBPACK_IMPORTED_MODULE_0__["UserService"], _angular_router__WEBPACK_IMPORTED_MODULE_3__["Router"]])
    ], OnboardUserComponent);
    return OnboardUserComponent;
}());



/***/ }),

/***/ "./src/app/dashboard/user/profile/profile.component.html":
/*!***************************************************************!*\
  !*** ./src/app/dashboard/user/profile/profile.component.html ***!
  \***************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div class=\"common-container\">\r\n    <div class=\"container\">\r\n    <div class=\"row\">\r\n        <div class=\"col-md-6\"><h2>User Profile</h2></div>\r\n        <div class=\"col-md-6\"><button  [routerLink]=\"['../list']\" class=\"right btn btn-primary\">User List</button></div>\r\n    </div>\r\n  <div class=\"row\">\r\n      <div class=\"col-md-6 offset-md-3\">\r\n         \r\n          <form [formGroup]=\"profileForm\" (ngSubmit)=\"onSubmit()\">\r\n              <div class=\"form-group\">\r\n                  <label>Name</label>\r\n                  <input type=\"text\" formControlName=\"name\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && pf.name.errors }\" />\r\n                  <div *ngIf=\"submitted && pf.name.errors\" class=\"invalid-feedback\">\r\n                      <div *ngIf=\"pf.name.errors.required\">Name is required</div>\r\n                  </div>\r\n              </div>\r\n              <div class=\"form-group\">\r\n                  <label>Email / Username</label>\r\n                  <input type=\"text\" formControlName=\"username\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && pf.username.errors }\" />\r\n                  <div *ngIf=\"submitted && pf.username.errors\" class=\"invalid-feedback\">\r\n                      <div *ngIf=\"pf.username.errors.required\">Email is required</div>\r\n                      <div *ngIf=\"pf.username.errors.username\">Email must be a valid email address</div>\r\n                  </div>\r\n              </div>\r\n              <div class=\"form-group\">\r\n                <label>Mobile</label>\r\n                <input type=\"text\" formControlName=\"mobile\" class=\"form-control\" [ngClass]=\"{ 'is-invalid': submitted && pf.mobile.errors }\" />\r\n              </div>\r\n              <div class=\"form-group\">\r\n                  <button class=\"btn btn-primary\">Update Profile</button>\r\n              </div>\r\n          </form>\r\n      </div>\r\n  </div>\r\n</div>\r\n</div>"

/***/ }),

/***/ "./src/app/dashboard/user/profile/profile.component.scss":
/*!***************************************************************!*\
  !*** ./src/app/dashboard/user/profile/profile.component.scss ***!
  \***************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ""

/***/ }),

/***/ "./src/app/dashboard/user/profile/profile.component.ts":
/*!*************************************************************!*\
  !*** ./src/app/dashboard/user/profile/profile.component.ts ***!
  \*************************************************************/
/*! exports provided: ProfileComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ProfileComponent", function() { return ProfileComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
/* harmony import */ var _user_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../user.service */ "./src/app/dashboard/user/user.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};



var ProfileComponent = /** @class */ (function () {
    function ProfileComponent(formBuilder, userService) {
        this.formBuilder = formBuilder;
        this.userService = userService;
        this.submitted = false;
    }
    ProfileComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.profileForm = this.formBuilder.group({
            _id: ['', _angular_forms__WEBPACK_IMPORTED_MODULE_1__["Validators"].required],
            name: ['', _angular_forms__WEBPACK_IMPORTED_MODULE_1__["Validators"].required],
            username: ['', [_angular_forms__WEBPACK_IMPORTED_MODULE_1__["Validators"].required, _angular_forms__WEBPACK_IMPORTED_MODULE_1__["Validators"].email]],
            mobile: ['', _angular_forms__WEBPACK_IMPORTED_MODULE_1__["Validators"].required],
        });
        this.userService.getProfile().subscribe(function (res) {
            _this.profileForm.reset(res['user']);
        });
    };
    Object.defineProperty(ProfileComponent.prototype, "pf", {
        get: function () {
            return this.profileForm.controls;
        },
        enumerable: true,
        configurable: true
    });
    ProfileComponent.prototype.onSubmit = function () {
        this.submitted = true;
        // stop here if form is invalid
        if (this.profileForm.invalid) {
            return;
        }
        this.userService.update(this.profileForm.value).subscribe(function (res) {
            if (res['success']) {
                alert('Updated Successfully');
            }
            else {
                alert('Error!');
            }
        });
    };
    ProfileComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-profile',
            template: __webpack_require__(/*! ./profile.component.html */ "./src/app/dashboard/user/profile/profile.component.html"),
            styles: [__webpack_require__(/*! ./profile.component.scss */ "./src/app/dashboard/user/profile/profile.component.scss")]
        }),
        __metadata("design:paramtypes", [_angular_forms__WEBPACK_IMPORTED_MODULE_1__["FormBuilder"], _user_service__WEBPACK_IMPORTED_MODULE_2__["UserService"]])
    ], ProfileComponent);
    return ProfileComponent;
}());



/***/ }),

/***/ "./src/app/dashboard/user/user-list/user-list.component.html":
/*!*******************************************************************!*\
  !*** ./src/app/dashboard/user/user-list/user-list.component.html ***!
  \*******************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div class=\"common-container\">\r\n  <div class=\"container\">\r\n\r\n  <div class=\"row\">\r\n    <div class=\"col-md-6\">\r\n      <h3>User List</h3>\r\n    </div>\r\n    <div class=\"col-md-6\">\r\n      <button [routerLink]=\"['../onboard']\" class=\"right btn btn-primary\">Onboard User</button>\r\n    </div>\r\n  </div>\r\n\r\n  <div class=\"row\">\r\n    <div class=\"col-md-12\">\r\n      <ag-grid-angular style=\"width: 100%; height: 450px;\" class=\"ag-theme-balham\" [columnDefs]=\"columnDefs\" [rowData]=\"userList\"\r\n        [enableSorting]=\"true\" [enableFilter]=\"true\" [pagination]=\"true\" [paginationAutoPageSize]=\"true\"\r\n        [enableColResize]=\"true\" (firstDataRendered)=\"onFirstDataRendered($event)\">\r\n      </ag-grid-angular>\r\n    </div>\r\n  </div>\r\n\r\n\r\n</div>\r\n</div>"

/***/ }),

/***/ "./src/app/dashboard/user/user-list/user-list.component.scss":
/*!*******************************************************************!*\
  !*** ./src/app/dashboard/user/user-list/user-list.component.scss ***!
  \*******************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ""

/***/ }),

/***/ "./src/app/dashboard/user/user-list/user-list.component.ts":
/*!*****************************************************************!*\
  !*** ./src/app/dashboard/user/user-list/user-list.component.ts ***!
  \*****************************************************************/
/*! exports provided: UserListComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "UserListComponent", function() { return UserListComponent; });
/* harmony import */ var _user_service__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./../user.service */ "./src/app/dashboard/user/user.service.ts");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var UserListComponent = /** @class */ (function () {
    function UserListComponent(userService) {
        this.userService = userService;
        this.userList = [];
        this.columnDefs = [
            { headerName: 'Name', field: 'name' },
            { headerName: 'Email', field: 'username' },
            { headerName: 'Mobile', field: 'mobile' },
            { headerName: 'Role', field: 'role' },
            { headerName: 'Joined On', field: 'createdAt', filter: 'agDateColumnFilter',
                valueFormatter: function (params) {
                    var date = new Date(parseInt(params.value));
                    return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getUTCFullYear();
                }
            },
            { headerName: 'Is Active', field: 'isActive' },
            { headerName: 'Is Deleted', field: 'isDeleted' },
        ];
    }
    UserListComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.userService.getUsers({}).subscribe(function (res) {
            if (res['success']) {
                _this.userList = res['data'];
            }
            else {
                alert('Failed');
            }
        });
    };
    UserListComponent.prototype.onFirstDataRendered = function (params) {
        params.api.sizeColumnsToFit();
    };
    UserListComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
            selector: 'app-user-list',
            template: __webpack_require__(/*! ./user-list.component.html */ "./src/app/dashboard/user/user-list/user-list.component.html"),
            styles: [__webpack_require__(/*! ./user-list.component.scss */ "./src/app/dashboard/user/user-list/user-list.component.scss")]
        }),
        __metadata("design:paramtypes", [_user_service__WEBPACK_IMPORTED_MODULE_0__["UserService"]])
    ], UserListComponent);
    return UserListComponent;
}());



/***/ }),

/***/ "./src/app/dashboard/user/user.module.ts":
/*!***********************************************!*\
  !*** ./src/app/dashboard/user/user.module.ts ***!
  \***********************************************/
/*! exports provided: UserModule */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "UserModule", function() { return UserModule; });
/* harmony import */ var ag_grid_angular__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ag-grid-angular */ "./node_modules/ag-grid-angular/main.js");
/* harmony import */ var ag_grid_angular__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(ag_grid_angular__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_common__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/common */ "./node_modules/@angular/common/fesm5/common.js");
/* harmony import */ var _user_router__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./user.router */ "./src/app/dashboard/user/user.router.ts");
/* harmony import */ var _profile_profile_component__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./profile/profile.component */ "./src/app/dashboard/user/profile/profile.component.ts");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
/* harmony import */ var _user_list_user_list_component__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./user-list/user-list.component */ "./src/app/dashboard/user/user-list/user-list.component.ts");
/* harmony import */ var _onboard_user_onboard_user_component__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./onboard-user/onboard-user.component */ "./src/app/dashboard/user/onboard-user/onboard-user.component.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};








var UserModule = /** @class */ (function () {
    function UserModule() {
    }
    UserModule = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["NgModule"])({
            imports: [
                _angular_common__WEBPACK_IMPORTED_MODULE_2__["CommonModule"],
                _user_router__WEBPACK_IMPORTED_MODULE_3__["UserRouter"],
                _angular_forms__WEBPACK_IMPORTED_MODULE_5__["FormsModule"],
                _angular_forms__WEBPACK_IMPORTED_MODULE_5__["ReactiveFormsModule"],
                ag_grid_angular__WEBPACK_IMPORTED_MODULE_0__["AgGridModule"].withComponents([])
            ],
            declarations: [_profile_profile_component__WEBPACK_IMPORTED_MODULE_4__["ProfileComponent"], _user_list_user_list_component__WEBPACK_IMPORTED_MODULE_6__["UserListComponent"], _onboard_user_onboard_user_component__WEBPACK_IMPORTED_MODULE_7__["OnboardUserComponent"]]
        })
    ], UserModule);
    return UserModule;
}());



/***/ }),

/***/ "./src/app/dashboard/user/user.router.ts":
/*!***********************************************!*\
  !*** ./src/app/dashboard/user/user.router.ts ***!
  \***********************************************/
/*! exports provided: userRouter, UserRouter */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "userRouter", function() { return userRouter; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "UserRouter", function() { return UserRouter; });
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/router */ "./node_modules/@angular/router/fesm5/router.js");
/* harmony import */ var _profile_profile_component__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./profile/profile.component */ "./src/app/dashboard/user/profile/profile.component.ts");
/* harmony import */ var _onboard_user_onboard_user_component__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./onboard-user/onboard-user.component */ "./src/app/dashboard/user/onboard-user/onboard-user.component.ts");
/* harmony import */ var _user_list_user_list_component__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./user-list/user-list.component */ "./src/app/dashboard/user/user-list/user-list.component.ts");




var userRouter = [
    { path: '', redirectTo: 'profile', pathMatch: 'full' },
    { path: 'profile', component: _profile_profile_component__WEBPACK_IMPORTED_MODULE_1__["ProfileComponent"] },
    { path: 'onboard', component: _onboard_user_onboard_user_component__WEBPACK_IMPORTED_MODULE_2__["OnboardUserComponent"] },
    { path: 'list', component: _user_list_user_list_component__WEBPACK_IMPORTED_MODULE_3__["UserListComponent"] },
];
var UserRouter = _angular_router__WEBPACK_IMPORTED_MODULE_0__["RouterModule"].forChild(userRouter);


/***/ }),

/***/ "./src/app/dashboard/user/user.service.ts":
/*!************************************************!*\
  !*** ./src/app/dashboard/user/user.service.ts ***!
  \************************************************/
/*! exports provided: UserService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "UserService", function() { return UserService; });
/* harmony import */ var _environments_environment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./../../../environments/environment */ "./src/environments/environment.ts");
/* harmony import */ var _angular_common_http__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/common/http */ "./node_modules/@angular/common/fesm5/http.js");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};



var UserService = /** @class */ (function () {
    function UserService(http) {
        this.http = http;
    }
    UserService.prototype.getProfile = function () {
        return this.http.get(_environments_environment__WEBPACK_IMPORTED_MODULE_0__["environment"].api.url + 'users/profile');
    };
    UserService.prototype.update = function (userInfo) {
        return this.http.put(_environments_environment__WEBPACK_IMPORTED_MODULE_0__["environment"].api.url + 'users/update', userInfo);
    };
    UserService.prototype.onboard = function (newUser) {
        return this.http.post(_environments_environment__WEBPACK_IMPORTED_MODULE_0__["environment"].api.url + 'users/onboard', newUser);
    };
    UserService.prototype.getUsers = function (criteria) {
        return this.http.post(_environments_environment__WEBPACK_IMPORTED_MODULE_0__["environment"].api.url + 'users/getAll', criteria);
    };
    UserService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_2__["Injectable"])({
            providedIn: 'root'
        }),
        __metadata("design:paramtypes", [_angular_common_http__WEBPACK_IMPORTED_MODULE_1__["HttpClient"]])
    ], UserService);
    return UserService;
}());



/***/ })

}]);
//# sourceMappingURL=user-user-module.js.map