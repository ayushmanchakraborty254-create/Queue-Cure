/**
 * Formats a Date object or timestamp as DD/MM/YYYY
 */
export const formatDate = (dateObj) => {
  if (!dateObj) return 'N/A';
  const d = new Date(dateObj);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Formats a Date object or timestamp as HH:MM:SS
 */
export const formatTime = (dateObj) => {
  if (!dateObj) return 'N/A';
  const d = new Date(dateObj);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Dynamically constructs a token string based on the doctor's name and chamber number
 * e.g., Doctor 'TEST' in Chamber '101' with token 1 becomes 'TE-101-1'
 */
export const getDoctorToken = (docName, chamber, tokenNumber) => {
  const cleanName = (docName || 'QC').replace(/Dr\.\s+/i, '').trim();
  const prefix = cleanName.substring(0, 2).toUpperCase();
  const room = chamber || '101';
  return `${prefix}-${room}-${tokenNumber}`;
};

/**
 * Generates and downloads a Word-compatible .doc file for a given session report
 */
export const downloadSessionReport = (session) => {
  const doctorName = session.doctorName || 'TEST';
  const department = session.doctorDept || 'N/A';
  const chamber = session.doctorChamber || '101';
  const phone = session.doctorPhone || 'N/A';
  const sessionName = session.sessionName || 'Session';
  const dateStr = formatDate(session.startTime);
  
  const startTimeStr = formatTime(session.startTime);
  const endTimeStr = formatTime(session.endTime);
  const timeRange = `${startTimeStr} - ${endTimeStr}`;

  // Attended Patients rows
  let attendedRows = '';
  if (session.attendedPatients && session.attendedPatients.length > 0) {
    attendedRows = session.attendedPatients.map(p => `
      <tr>
        <td style="font-weight: bold; border: 1px solid #cbd5e1; padding: 10px; font-size: 11.5px; color: #1e293b;">
          ${getDoctorToken(doctorName, chamber, p.token_number)}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 10px; font-size: 11.5px; color: #334155;">
          ${p.patient_name}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 10px; font-size: 11.5px; color: #334155;">
          ${p.prescription_no || 'N/A'}
        </td>
      </tr>
    `).join('');
  } else {
    attendedRows = `
      <tr>
        <td colspan="3" style="border: 1px solid #cbd5e1; padding: 12px; font-size: 11px; text-align: center; color: #94a3b8; font-style: italic;">
          No patients attended during this session.
        </td>
      </tr>
    `;
  }

  // Unattended Patients rows
  let unattendedRows = '';
  const unattendedCount = session.unattendedPatients ? session.unattendedPatients.length : 0;
  if (unattendedCount > 0) {
    unattendedRows = session.unattendedPatients.map(p => `
      <tr>
        <td style="font-weight: bold; border: 1px solid #cbd5e1; padding: 10px; font-size: 11.5px; color: #1e293b;">
          ${getDoctorToken(doctorName, chamber, p.token_number)}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 10px; font-size: 11.5px; color: #334155;">
          ${p.patient_name}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 10px; font-size: 11.5px; color: #334155;">
          N/A
        </td>
      </tr>
    `).join('');
  } else {
    unattendedRows = `
      <tr>
        <td colspan="3" style="border: 1px solid #cbd5e1; padding: 12px; font-size: 11px; text-align: center; color: #94a3b8; font-style: italic;">
          No unattended patients.
        </td>
      </tr>
    `;
  }

  // HTML formatted for MS Word (with standard XML declarations for styling/page view settings)
  const docHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Queue Cure - Session Report</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: 8.5in 11.0in;
          margin: 1.0in 1.0in 1.0in 1.0in;
          mso-header-margin: 0.5in;
          mso-footer-margin: 0.5in;
          mso-paper-source: 0;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 0;
        }
        .header-title {
          font-size: 24px;
          font-weight: bold;
          color: #1d4ed8;
          text-align: center;
          margin: 0;
          padding: 0;
          letter-spacing: -0.5px;
        }
        .header-subtitle {
          font-size: 11px;
          color: #64748b;
          text-align: center;
          margin: 4px 0 0 0;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        .header-divider {
          border-bottom: 2px solid #2563eb;
          margin-top: 12px;
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 14px;
          font-weight: bold;
          color: #1e3a8a;
          margin-top: 25px;
          margin-bottom: 10px;
          padding-bottom: 4px;
          border-bottom: 1px solid #cbd5e1;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
        }
        .meta-table td {
          width: 50%;
          border: 1px solid #e2e8f0;
          padding: 10px 12px;
          background-color: #f8fafc;
          font-size: 11px;
          color: #475569;
        }
        .meta-label {
          font-weight: bold;
          color: #1e293b;
        }
        .patient-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .patient-table th {
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 10px;
          font-size: 11.5px;
          font-weight: bold;
          color: #1e293b;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div style="text-align: center;">
        <h1 class="header-title">Queue Cure - Session Report</h1>
        <p class="header-subtitle">Clinic Queue Management System</p>
        <div class="header-divider"></div>
      </div>

      <table class="meta-table">
        <tr>
          <td><span class="meta-label">Doctor Name :</span> ${doctorName}</td>
          <td><span class="meta-label">Department :</span> ${department}</td>
        </tr>
        <tr>
          <td><span class="meta-label">Chamber Number :</span> ${chamber}</td>
          <td><span class="meta-label">Phone Number :</span> ${phone}</td>
        </tr>
        <tr>
          <td colspan="2"><span class="meta-label">Session Name :</span> ${sessionName}</td>
        </tr>
        <tr>
          <td><span class="meta-label">Date :</span> ${dateStr}</td>
          <td><span class="meta-label">Time :</span> ${timeRange}</td>
        </tr>
      </table>

      <h2 class="section-title">Attended Patients</h2>
      <table class="patient-table">
        <thead>
          <tr>
            <th style="width: 25%;">Token</th>
            <th style="width: 45%;">Patient Name</th>
            <th style="width: 30%;">Prescription No</th>
          </tr>
        </thead>
        <tbody>
          ${attendedRows}
        </tbody>
      </table>

      <h2 class="section-title">Unattended Patients (${unattendedCount})</h2>
      <table class="patient-table">
        <thead>
          <tr>
            <th style="width: 25%;">Token</th>
            <th style="width: 45%;">Patient Name</th>
            <th style="width: 30%;">Prescription No</th>
          </tr>
        </thead>
        <tbody>
          ${unattendedRows}
        </tbody>
      </table>
    </body>
    </html>
  `;

  // Create a Blob with application/msword and UTF-8 encoding (with BOM to ensure correct text decoding)
  const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Format the file name cleanly (e.g. Test_Session_Report.doc)
  const safeSessionName = sessionName.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  link.download = `${safeSessionName}_Session_Report.doc`;
  
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
