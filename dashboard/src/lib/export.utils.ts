export function exportToCSV(data: any[], filename: string) {
    if (!data || data.length === 0) {
        console.warn("No data to export");
        return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(","), // Header row
        ...data.map(row =>
            headers.map(fieldName => {
                const value = row[fieldName];
                // Handle strings with commas or quotes
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            }).join(",")
        )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export function exportToExcel(data: any[], filename: string) {
    if (!data || data.length === 0) {
        console.warn("No data to export");
        return;
    }

    // Create a simple HTML table that Excel can open
    const headers = Object.keys(data[0]);
    const tableContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>
            <table border="1">
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${data.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob([tableContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.xls`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function exportToPDF(elementId: string, filename: string) {
    // Simple print-based PDF export
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn("Element not found for PDF export");
        return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(`
            <html>
            <head>
                <title>${filename}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f4f4f4; }
                </style>
            </head>
            <body>
                ${element.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }
}
