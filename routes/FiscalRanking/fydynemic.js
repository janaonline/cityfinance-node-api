const fiscalRankingFormJson = () => {
  return {
    goverPar : {
      normalData: {
        key: 'normalData',
        label: '',
        yearData: [
          {
            label: 'ULB website URL link where Copy of Audited Annual Accounts of FY 2017-18 to FY 2019-20 are available',
            key: 'webUrlAnnual',
            postion: '1',
            value: '',
            min: '',
            max: '',
            required: true,
            type: '',
            bottomText: ``,
            placeHolder: '',
            input: 'text'
          },
          {
            label: 'Do you maintain a Digital Property Tax Register?',
            key: 'digitalRegtr',
            postion: '2',
            value: '',
            min: '',
            max: '',
            required: true,
            type: '',
            bottomText: ``,
            placeHolder: '',
            input: 'radio'
          },
          {
            label: 'Is the property tax register GIS-based?',
            key: 'registerGis',
            postion: '3',
            value: '',
            min: '',
            max: '',
            required: true,
            type: '',
            bottomText: ``,
            placeHolder: '',
            input: 'radio'
          },
          {
            label: 'Do you use accounting software?',
            key: 'accountStwre',
            postion: '4',
            value: '',
            min: '',
            max: '',
            required: true,
            type: '',
            bottomText: ``,
            placeHolder: '',
            input: 'radio'
          }
        ]
      },
      ownRevDetails: {
        key: 'ownRevDetails',
        label: 'Own Revenue Details',
        yearData: [
          {
            label: 'Total Own Revenue Arrears as on 31st March 2020',
            key: 'totalOwnRevenueArea',
            postion: '1',
            value: '',
            min: '',
            max: '',
            required: true,
            type: '',
            bottomText: ``,
            placeHolder: '',
            input: 'number'
          },
          {
            label: 'FY 2019-20 - by Cash/Cheque/DD',
            key: 'fy_19_20_cash',
            postion: '2',
            value: '',
            min: '',
            max: '',
            required: true,
            type: '',
            bottomText: ``,
            placeHolder: '',
            input: 'number'
          },
          {
            label: 'FY 2019-20 - by Online (UPI,Netbanking,Credit Card,Debit Card,others)',
            key: 'fy_19_20_online',
            postion: '3',
            value: '',
            min: '',
            max: '',
            required: true,
            type: '',
            bottomText: ``,
            placeHolder: '',
            input: 'number'
          },
        ]
      },
      propertyDetails: {
        key: 'propertyDetails',
        label: 'Property Details',
        yearData: [
          {
            label: 'Number of Properties assessed/listed as per Property Tax Register',
            key: 'property_tax_register',
            postion: '1',
            value: '',
            min: '',
            max: '',
            required: true,
            type: '',
            bottomText: ``,
            placeHolder: '',
            input: 'number'
          },
          {
            label: 'Number of Properties exemt from paying Property Tax',
            key: 'paying_property_tax',
            postion: '2',
            value: '',
            min: '',
            max: '',
            required: true,
            type: '',
            bottomText: ``,
            placeHolder: '',
            input: 'number'
          },
          {
            label: 'Number of Properties for which Property Tax has been paid',
            key: 'paid_property_tax',
            postion: '3',
            value: '',
            min: '',
            max: '',
            required: true,
            type: '',
            bottomText: ``,
            placeHolder: '',
            input: 'number'
          },
        ]
      },
    },
    revenueMob: {
      totalRecActual: {
        key: 'totalRecActual',
        label: 'Total Receipts (Actual)',
        yearData: [
          {
            label: 'FY 2016-17',
            key: 'FY2016-17',
            postion: '1',
            amount: '',
            file: '',
            min: 0,
            max: 13,
            required: true,
            type: 'totalRcptActl',
            code: [],
            year: "63735a1ad44534713673bc2b",
            bottomText: 'to be taken from approved Annual Budget of ',
            placeHolder: ''
          },
          {
            label: 'FY 2017-18',
            key: 'FY2017-18',
            postion: '2',
            amount: '',
            file: '',
            min: 0,
            max: 13,
            required: true,
            type: 'totalRcptActl',
            code: [],
            year: "63735a5bd44534713673c1ca",
            bottomText: 'to be taken from approved Annual Budget of ',
            placeHolder: ''
          },
          {
            label: 'FY 2018-19',
            key: 'FY2018-19',
            postion: '3',
            amount: '',
            file: '',
            min: 0,
            max: 13,
            required: true,
            type: 'totalRcptActl',
            code: [],
            year: "63735a4bd44534713673bfbf",
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'FY 2019-20',
            key: 'FY2019-20',
            postion: '4',
            amount: '',
            file: '',
            min: 0,
            max: 13,
            required: true,
            type: 'totalRcptActl',
            code: [],
            year: "607697074dff55e6c0be33ba",
            bottomText: `to be taken from approved Annual Budget `,
            placeHolder: ''
          }
        ]
      },
      totalRecBudgetEst: {
        key: 'totalRecBudgetEst',
        label: 'Total Receipts (Budget Estimate)',
        yearData: [
          {
            label: 'FY 2016-17',
            key: 'FY2016-17',
            postion: '1',
            amount: '',
            file: '',
            min: 0,
            max: 13,
            required: true,
            type: 'totalRcptBudget',
            code: [],
            year: "63735a1ad44534713673bc2b",
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'FY 2017-18',
            key: 'FY2017-18',
            postion: '2',
            amount: '',
            file: '',
            min: 0,
            max: 13,
            required: true,
            type: 'totalRcptBudget',
            code: [],
            year: "63735a5bd44534713673c1ca",
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'FY 2018-19',
            key: 'FY2018-19',
            postion: '3',
            amount: '',
            file: '',
            min: 0,
            max: 13,
            required: true,
            type: 'totalRcptBudget',
            code: [],
            year: "63735a4bd44534713673bfbf",
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'FY 2019-20',
            key: 'FY2019-20',
            postion: '4',
            amount: '',
            file: '',
            min: 0,
            max: 13,
            required: true,
            type: 'totalRcptBudget',
            code: [],
            year: "607697074dff55e6c0be33ba",
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          }
        ]
      },
      totalOwnRevenues: {
        key: 'totalOwnRevenues',
        label: 'Total Own Revenues ',
        yearData: [
          {
            label: 'FY 2016-17',
            key: 'FY2016-17',
            postion: '1',
            amount: '',
            file: '',
            min: 0,
            max: 13,
            required: true,
            type: 'totalOwnRvnue',
            code: ['110', '130', '140', '150', '180'],
            year: "63735a1ad44534713673bc2b",
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'FY 2017-18',
            key: 'FY2017-18',
            postion: '2',
            amount: '',
            file: '',
            min: 0,
            max: 13,
            required: true,
            type: 'totalOwnRvnue',
            year: "63735a5bd44534713673c1ca",
            code: ['110', '130', '140', '150', '180'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'FY 2018-19',
            key: 'FY2018-19',
            postion: '3',
            amount: '',
            file: '',
            min: 0,
            max: 13,
            required: true,
            type: 'totalOwnRvnue',
            code: ['110', '130', '140', '150', '180'],
            year: "63735a4bd44534713673bfbf",
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'FY 2019-20',
            key: 'FY2019-20',
            postion: '4',
            amount: '',
            file: '',
            min: 0,
            max: 13,
            required: true,
            type: 'totalOwnRvnue',
            year: "607697074dff55e6c0be33ba",
            code: ['110', '130', '140', '150', '180'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          }
        ]
      },
      totalPropTaxRevenue: {
        key: 'totalPropTaxRevenue',
        label: 'Total Property Tax Revenue ',
        yearData: [
          {
            label: 'FY 2016-17',
            key: 'FY2016-17',
            postion: '1',
            amount: '',
            file: '',
            min: 0,
            max: 13,
            required: true,
            type: 'totalProperty',
            year: "63735a1ad44534713673bc2b",
            code: ['11001'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'FY 2017-18',
            key: 'FY2017-18',
            postion: '2',
            amount: '',
            file: '',
            min: 0,
            max: 13,
            required: true,
            type: 'totalProperty',
            year: "63735a5bd44534713673c1ca",
            code: ['11001'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'FY 2018-19',
            key: 'FY2018-19',
            postion: '3',
            amount: '',
            file: '',
            min: 0,
            max: 13,
            required: true,
            type: 'totalProperty',
            year: "63735a4bd44534713673bfbf",
            code: ['11001'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'FY 2019-20',
            key: 'FY2019-20',
            postion: '4',
            amount: '',
            file: '',
            min: 0,
            max: 13,
            required: true,
            type: 'totalProperty',
            code: ['11001'],
            year: "607697074dff55e6c0be33ba",
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          }
        ]
      },
    },
    expPerf: {
      totalGrossBlock: {
        key: 'totalGrossBlock',
        label: 'Total Gross Block',
        yearData: [
          {
            label: 'As on 31st March 2017',
            key: 'totalGrossBlock_17',
            postion: '1',
            amount: '',
            file: '',
            min: '',
            max: '',
            required: true,
            type: 'totalGrossBl',
            year: "63735a1ad44534713673bc2b",
            code: ['410'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'As on 31st March 2018',
            key: 'totalGrossBlock_18',
            postion: '2',
            amount: '',
            file: '',
            min: '',
            max: '',
            required: true,
            type: 'totalGrossBl',
            year: "63735a5bd44534713673c1ca",
            code: ['410'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'As on 31st March 2019',
            key: 'totalGrossBlock_19',
            postion: '3',
            amount: '',
            file: '',
            min: '',
            max: '',
            required: true,
            type: 'totalGrossBl',
            year: "63735a4bd44534713673bfbf",
            code: ['410'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'As on 31st March 2020',
            key: 'totalGrossBlock_20',
            postion: '4',
            amount: '',
            file: '',
            min: '',
            max: '5',
            required: true,
            type: 'totalGrossBl',
            year: "607697074dff55e6c0be33ba",
            code: ['410'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          }
        ]
      },
      totalCWIP: {
        key: 'totalCWIP',
        label: 'Total Capital Work in Progress (CWIP)',
        yearData: [
          {
            label: 'As on 31st March 2017',
            key: 'totalCWIP_17',
            postion: '1',
            amount: '',
            file: '',
            min: '',
            max: '',
            required: true,
            type: 'totalCWIP',
            year: "63735a1ad44534713673bc2b",
            code: ['412'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'As on 31st March 2018',
            key: 'totalCWIP_18',
            postion: '2',
            amount: '',
            file: '',
            min: '',
            max: '',
            required: true,
            type: 'totalCWIP',
            year: "63735a5bd44534713673c1ca",
            code: ['412'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'As on 31st March 2019',
            key: 'totalCWIP_19',
            postion: '3',
            amount: '',
            file: '',
            min: '',
            max: '',
            required: true,
            type: 'totalCWIP',
            year: "63735a4bd44534713673bfbf",
            code: ['412'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'As on 31st March 2020',
            key: 'totalCWIP_20',
            postion: '4',
            amount: '',
            file: '',
            min: '',
            max: '',
            required: true,
            type: 'totalCWIP',
            year: "607697074dff55e6c0be33ba",
            code: ['412'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          }
        ]
      },
      estAdmExpenses: {
        key: 'estAdmExpenses',
        label: 'Establishment & Administrative Expenses',
        yearData: [
          {
            label: 'FY 2017-18',
            key: 'estAdmExpenses_17-18',
            postion: '2',
            amount: '',
            file: '',
            min: '',
            max: '',
            required: true,
            type: 'estAdmExpenses',
            year: "63735a5bd44534713673c1ca",
            code: ['210', '220'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'FY 2018-19',
            key: 'estAdmExpenses_18-19',
            postion: '3',
            amount: '',
            file: '',
            min: '',
            max: '',
            required: true,
            type: 'estAdmExpenses',
            year: "63735a4bd44534713673bfbf",
            code: ['210', '220'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'FY 2019-20',
            key: 'estAdmExpenses_19-20',
            postion: '4',
            amount: '',
            file: '',
            min: '',
            max: '',
            required: true,
            type: 'estAdmExpenses',
            year: "607697074dff55e6c0be33ba",
            code: ['210', '220'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          }
        ]
      },
      totalRevExp: {
        key: 'totalRevExp',
        label: 'Total Revenue Expenditure',
        yearData: [
          {
            label: 'FY 2017-18',
            key: 'totalRevExp_17-18',
            postion: '2',
            amount: '',
            file: '',
            min: '',
            max: '',
            required: true,
            type: 'totalRevExp',
            year: "63735a5bd44534713673c1ca",
            code: ['210', '220', '230', '240', '200'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'FY 2018-19',
            key: 'totalRevExp_18-19',
            postion: '3',
            amount: '',
            file: '',
            min: '',
            max: '',
            required: true,
            type: 'totalRevExp',
            year: "63735a4bd44534713673bfbf",
            code: ['210', '220', '230', '240', '200'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          },
          {
            label: 'FY 2019-20',
            key: 'totalRevExp_19-20',
            postion: '4',
            amount: '',
            file: '',
            min: '',
            max: '',
            required: true,
            type: 'totalRevExp',
            year: "607697074dff55e6c0be33ba",
            code: ['210', '220', '230', '240', '200'],
            bottomText: `to be taken from approved Annual Budget of `,
            placeHolder: ''
          }
        ]
      },
    },
    uploadFyDoc: {
      guidanceNotes: {
        key: 'guidanceNotes',
        label: 'Guidance Notes:',
        yearData: [
          {
            title: '',
            pos: '1',
            desc: `Audited Annual Accounts should include: Income and Expenditure Statement, Balance Sheet, Schedules to IES and BS, and Auditor's Report.`
          },
          {
            title: '',
            pos: '2',
            desc: `Annual Budgets should be the detailed final approved version and should be in English language.`
          },
          {
            title: '',
            pos: '3',
            desc: `Files uploaded should be in PDF only and file size should not exceed 5MB.`
          }
        ]
      },
      appAnnualBudget: {
        key: 'appAnnualBudget',
        label: 'Copy of Detailed Approved Annual Budget of',
        yearData: [
          {
            label: 'FY 2017-18',
            key: 'appAnnualBudget_2017-18',
            postion: '1',
            amount: '',
            file: {
              name: "",
              url: ""
            },
            min: '',
            max: '',
            required: true,
            type: 'appAnnualBudget',
            year: "63735a5bd44534713673c1ca",
            code: [],
            bottomText: `Maximum Size  5MB (pdf files only)`,
            placeHolder: ''
          },
          {
            label: 'FY 2018-19',
            key: 'appAnnualBudget_2018-19',
            postion: '1',
            amount: '',
            file: {
              name: "",
              url: ""
            },
            min: '',
            max: '',
            required: true,
            type: 'appAnnualBudget',
            year: "63735a4bd44534713673bfbf",
            code: [],
            bottomText: `Maximum Size  5MB (pdf files only)`,
            placeHolder: ''
          },
          {
            label: 'FY 2019-20',
            key: 'appAnnualBudget_2019-20',
            postion: '1',
            amount: '',
            file: {
              name: "",
              url: ""
            },
            min: '',
            max: '',
            required: true,
            type: 'appAnnualBudget',
            year: "607697074dff55e6c0be33ba",
            code: [],
            bottomText: `Maximum Size  5MB (pdf files only)`,
            placeHolder: ''
          },
        ]
      },
      auditedAnnualFySt: {
        key: 'auditedAnnualFySt',
        label: 'Copy of Detailed Audited Annual Accounts for',
        yearData: [
          {
            label: 'FY 2017-18',
            key: 'auditedAnnualFySt_2017-18',
            postion: '1',
            amount: '',
            file: {
              name: "",
              url: ""
            },
            min: '',
            max: '',
            required: true,
            type: 'auditedAnnualFySt',
            year: "63735a5bd44534713673c1ca",
            code: [],
            bottomText: `Maximum Size  5MB (pdf files only)`,
            placeHolder: ''
          },
          {
            label: 'FY 2018-19',
            key: 'auditedAnnualFySt_2018-19',
            postion: '2',
            amount: '',
            file: {
              name: "",
              url: ""
            },
            min: '',
            max: '',
            required: true,
            type: 'auditedAnnualFySt',
            year: "63735a4bd44534713673bfbf",
            code: [],
            bottomText: `Maximum Size  5MB (pdf files only)`,
            placeHolder: ''
          },
          {
            label: 'FY 2019-20',
            key: 'auditedAnnualFySt_2019-20',
            postion: '3',
            amount: '',
            file: {
              name: "",
              url: ""
            },
            min: '',
            max: '',
            required: true,
            type: 'auditedAnnualFySt',
            year: "607697074dff55e6c0be33ba",
            code: [],
            bottomText: `Maximum Size  5MB (pdf files only)`,
            placeHolder: ''
          },
        ]
      },
    }
  }
}
module.exports.fiscalRankingFormJson = fiscalRankingFormJson;