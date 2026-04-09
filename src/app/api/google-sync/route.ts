import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const getGoogleAuth = () => {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
};

export async function POST(req: NextRequest) {
  try {
    const { action, transaction } = await req.json();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("Missing GOOGLE_SPREADSHEET_ID in credentials");
    }

    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Default sheet name
    const sheetName = 'Sheet1'; 
    
    // Only fetch row indices if we are actively attempting to alter historical data
    let rowIndex = -1;
    let targetSheetId = 0;
    
    if (action === 'update' || action === 'delete') {
      const getRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:A`,
      });
      const rows = getRes.data.values || [];
      rowIndex = rows.findIndex(row => row[0] === transaction.id);
      
      if (rowIndex === -1) {
        // If not found, perhaps it was added before Google Sheets sync was fundamentally integrated.
        // Fallback to append if 'update', or silently ignore if 'delete'.
        if (action === 'delete') return NextResponse.json({ success: true, message: 'Row already missing' });
      }
    }

    // Handle Deletions cleanly via Google BatchUpdate operations
    if (action === 'delete') {
      if (rowIndex !== -1) {
        // Pull Google sheet metadata to map internal Array ID
        const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
        const sheet = sheetMeta.data.sheets?.find(s => s.properties?.title === sheetName);
        targetSheetId = sheet?.properties?.sheetId || 0;

        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId: targetSheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex, // Native 0-based Google mapping array
                  endIndex: rowIndex + 1
                }
              }
            }]
          }
        });
      }
      return NextResponse.json({ success: true, message: 'Deleted cleanly from Google Sheets' });
    }

    const rowData = [
      transaction.id, 
      transaction.date, 
      transaction.description, 
      transaction.category, 
      transaction.type, 
      transaction.payment_status, 
      transaction.amount
    ];

    // Handle Editing explicitly in place without stacking duplication
    if (action === 'update' && rowIndex !== -1) {
      // Overwrite the specific isolated row block.
      // Google sheets dimensions are universally 1-based (e.g. row index 4 maps structurally to A5:G5)
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${rowIndex + 1}:G${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });
      return NextResponse.json({ success: true, message: 'Transaction overwritten securely securely in Sheets' });
    } else {
      // Native Creation flow (or fallback creation if isolated record goes absent)
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:G`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      }); 
      return NextResponse.json({ success: true, message: 'Transaction appended securely to Sheets' });
    }

  } catch (error: any) {
    console.error('Google Sync Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to sync to Sheets', details: error.message }, { status: 500 });
  }
}
