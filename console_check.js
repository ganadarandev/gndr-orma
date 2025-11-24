// 브라우저 콘솔에서 실행할 코드
// F12 눌러서 콘솔 열고 이 코드 복사해서 실행

async function checkExcelData() {
    const token = localStorage.getItem('auth-token');

    const response = await fetch('http://localhost:8000/excel/load', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (data.success && data.sheets && data.sheets[0]) {
        const sheet = data.sheets[0];
        const row3 = sheet.data[2]; // Index 2 is row 3

        console.log("=== Row 3 Data from Backend ===");
        console.log("Column I (index 8):", row3[8]);
        console.log("Column J (index 9):", row3[9]);
        console.log("Column K (index 10):", row3[10]);

        // Check if values are strings or numbers
        console.log("\n=== Data Types ===");
        console.log("I type:", typeof row3[8], "Value:", row3[8]);
        console.log("J type:", typeof row3[9], "Value:", row3[9]);
        console.log("K type:", typeof row3[10], "Value:", row3[10]);

        // Check for commas
        if (typeof row3[8] === 'string' && row3[8].includes(',')) {
            console.log("WARNING: I has comma in value!");
        }

        // Try parsing
        console.log("\n=== Parsed Values ===");
        const parseValue = (val) => {
            if (typeof val === 'string') {
                const cleaned = val.replace(/,/g, '');
                return parseFloat(cleaned);
            }
            return val;
        };

        console.log("I parsed:", parseValue(row3[8]));
        console.log("J parsed:", parseValue(row3[9]));
        console.log("K parsed:", parseValue(row3[10]));

        // Show formatted values
        console.log("\n=== Formatted (with commas) ===");
        console.log("I formatted:", parseValue(row3[8]).toLocaleString('ko-KR'));
        console.log("J formatted:", parseValue(row3[9]).toLocaleString('ko-KR'));
        console.log("K formatted:", parseValue(row3[10]).toLocaleString('ko-KR'));
    }
}

checkExcelData();