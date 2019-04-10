'use strict';

const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');

class GoogleCalendar {
  constructor(config) {
    this.config = Object.assign({}, this.defaults(), config);
  }

  defaults() {
    return {
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      tokenPath: 'g_token.json'
    };
  }

  // ----------------------------------
  // GoogleAPI に接続
  // ----------------------------------
  connect() {
    return new Promise((resolve, reject) => {
      this.authorize().then(auth => {
        this.config.auth = auth;
        resolve();
      });
    });
  }

  // ----------------------------------
  // GoogleAPI認証
  // ----------------------------------
  authorize() {
    const OAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URL
    );
    return new Promise((resolve, reject) => {
      fs.readFile(this.config.tokenPath, (err, token) => {
        if (err) {
          this.getAccessToken(OAuth2Client).then(() => {
            resolve(OAuth2Client);
          });
        } else {
          // 接続時毎回tokenの更新
          OAuth2Client.credentials = JSON.parse(token);
          OAuth2Client.refreshAccessToken((err, token) => {
            if (err) {
              console.log(err);
              reject();
            }
            OAuth2Client.setCredentials(token);
            fs.writeFile(this.config.tokenPath, JSON.stringify(token), err => {
              if (err) {
                console.log(err);
                reject();
              }
              console.log('Google_Tokenを更新:', this.config.tokenPath);
            });
          });
          resolve(OAuth2Client);
        }
      });
    });
  }

  // ----------------------------------
  // GoogleAPIトークン発行
  // ----------------------------------
  getAccessToken(OAuth2Client) {
    const authURL = OAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.config.scopes
    });

    console.log('認証URL:', authURL);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve, reject) => {
      rl.question('認証トークン:', code => {
        rl.close();
        OAuth2Client.getToken(code, (err, token) => {
          if (err) {
            return console.log('トークンを発行できません', err);
          }
          OAuth2Client.setCredentials(token);

          // 発行したトークンを出力
          fs.writeFile(this.config.tokenPath, JSON.stringify(token), err => {
            if (err) {
              console.log(err);
              reject();
              console.log('トークン発行完了');
            }
          });
          resolve(OAuth2Client);
        });
      });
    });
  }

  // ----------------------------------
  // Google カレンダーから予定を取得
  // ----------------------------------
  EventLists(params) {
    return new Promise((resolve, reject) => {
      const calendar = google.calendar({
        version: 'v3',
        auth: this.config.auth
      });
      calendar.events.list(params, (err, res) => {
        if (err) {
          console.log('API ERROR:', err);
          reject();
        }
        // 取得したイベントデータ返却
        resolve(res.data.items);
      });
    });
  }
}

module.exports = GoogleCalendar;
