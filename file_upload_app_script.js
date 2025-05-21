var sheetName = "Sheet1";
var uploadFolderID = "129ht2t7_I_adSWPf0LK5OABZG_cgVlcN"; // Replace with your Drive folder ID
var scriptProp = PropertiesService.getScriptProperties();

function intialSetup() {
  var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  scriptProp.setProperty("key", activeSpreadsheet.getId());
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.openById(scriptProp.getProperty("key"));
    var sheet = doc.getSheetByName(sheetName);
    function uploadFile(fieldName, e, folder) {
      const base64 = e.parameter[fieldName];
      const fileName = e.parameter[`${fieldName}_filename`] || "uploaded_file";

      const rawData = Utilities.base64Decode(base64);
      const blob = Utilities.newBlob(rawData).setName(fileName);
      const file = folder.createFile(blob);
      return file.getUrl();
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nextRow = sheet.getLastRow() + 1;

    var newRow = headers.map(function (header) {
      return header === "timestamp" ? new Date() : e.parameter[header];
    });

    // Handle media file upload
    const folder = DriveApp.getFolderById(uploadFolderID);

    const mediaFields = ["media", "media_2", "media_3"];
    mediaFields.forEach(function (field) {
      const url = e.parameter[field] ? uploadFile(field, e, folder) : "";
      if (headers.indexOf(field) > -1) {
        newRow[headers.indexOf(field)] = url;
      } else {
        newRow.push(url);
      }
    });

    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);

    return ContentService.createTextOutput(
      JSON.stringify({ result: "success", row: nextRow })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ result: "error", error: error.message })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
