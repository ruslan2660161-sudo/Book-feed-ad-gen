import * as XLSX from 'xlsx';

export function downloadExcel(data: any[], filename: string = 'book_ads.xlsx') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ads");
  XLSX.writeFile(workbook, filename);
}
