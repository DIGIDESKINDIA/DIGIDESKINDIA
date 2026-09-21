/* eslint-disable @typescript-eslint/no-require-imports */
const XLSX = require('xlsx');

// Create a workbook with sample data
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ['Name', 'Age', 'City', 'Salary'],
  ['John Doe', 30, 'New York', 75000],
  ['Jane Smith', 28, 'Los Angeles', 85000],
  ['Bob Johnson', 35, 'Chicago', 95000],
  ['Alice Williams', 32, 'Houston', 105000]
]);
XLSX.utils.book_append_sheet(wb, ws, "Employees");
XLSX.writeFile(wb, 'test-excel.xlsx');
console.log('Test Excel file created: test-excel.xlsx');
