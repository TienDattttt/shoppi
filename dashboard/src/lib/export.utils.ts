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
