var express = require('express');
var router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const {colors} = require("debug");
const {GoogleAuth} = require("google-auth-library");

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.photos.readonly'];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function  listEvents(auth) {
  const calendar = google.calendar({version: 'v3', auth});
  const res = await calendar.events.list({
    calendarId: 'c7bb28c7b1c367ae09cdd52cec39d2eede05be0fd1434359f0a507261d5e1d8d@group.calendar.google.com',
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events = res.data.items;

  if (!events || events.length === 0) {
    console.log('No upcoming events found.');
    return;
  }
  console.log('Upcoming 10 events:');
  events.map((event, i) => {
    const start = event.start.dateTime || event.start.date;
    console.log(`${start} - ${event.summary}`);
  });
  return events;
}
async function downloadFile(auth) {
  // Get credentials and build service
  const service = google.drive({version: 'v3', auth});
  fileId = '1S5FN35PzXUxB8zIuTq30oFenZqMpfMxF';
  try {
    const file = await service.files.get({
      fileId: fileId,
      alt: 'media',
    });
    return file;
  } catch (err) {
    // TODO(developer) - Handle error
    throw err;
  }
}
/* GET home page. */
router.get('/', async function(req, res, next) {
  try{
    listE = await authorize().then(listEvents);
    /*png = await authorize().then(downloadFile);
    const blob = new Blob([JSON.stringify(png, null, 2)], {
      type: "image/png",
    });
    console.log(blob)
    console.log(URL.createObjectURL(blob))*/
    console.log(listE[1]);
    res.render('index', { title: 'Upcoming events', list: listE, pic: listE[0].creator.email});
  }catch (err){
    res.render('error')
  }
});

module.exports = router;
