
import { SHEET_URL } from '../constants';
import type { Submission } from '../types';

const parseCsvRow = (row: string): string[] => {
    const values: string[] = [];
    const regex = /(?:"([^"]*(?:""[^"]*)*)"|([^,]*))(?:,|$)/g;
    let match;
    while ((match = regex.exec(row)) !== null) {
        if (match[1] !== undefined) {
            values.push(match[1].replace(/""/g, '"'));
        } else {
            values.push(match[2]);
        }
        if (match[0].slice(-1) !== ',') break;
    }
    return values;
};

export const fetchSubmissions = async (): Promise<Submission[]> => {
    const response = await fetch(SHEET_URL);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const csvText = await response.text();
    const rows = csvText.trim().split('\n');
    const dataRows = rows.slice(1);

    const submissions: Submission[] = dataRows
        .map((row, index) => {
            const values = parseCsvRow(row);

            if (values.length < 5) {
                console.warn(`Skipping malformed row ${index + 2}: ${row}`);
                return null;
            }

            const predictionStr = values[3] ? values[3].replace(/[.,]/g, '') : '0';
            const prediction = parseInt(predictionStr, 10);
            
            return {
                id: index,
                timestamp: values[0] || '',
                phone: values[1] || '',
                choice: values[2] || '',
                prediction: isNaN(prediction) ? 0 : prediction,
                isValid: (values[4] || '').toUpperCase().trim() === 'TRUE',
            };
        })
        .filter((sub): sub is Submission => sub !== null && sub.isValid);

    return submissions;
};
