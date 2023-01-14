('use strict');

const moment = require('moment-timezone');
const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');

// 取得元カレンダーID
const calendarID = 't4vhbn0l7m309rkbbnd7321p3o@group.calendar.google.com';

class GoogleCalendar {
  constructor(config) {
    this.config = Object.assign({}, this.defaults(), config);
  }

  defaults() {
    return {
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      tokenPath: 'g_token.json',
    };
  }

  // ----------------------------------
  // GoogleAPI に接続
  // ----------------------------------
  connect() {
    return new Promise((resolve, reject) => {
      fs.readFile('credentials.json', (err, content) => {
        if (err) {
          return console.log('Error loading client secret file:', err);
        }

        this.authorize(JSON.parse(content)).then((auth) => {
          this.config.auth = auth;
          resolve();
        });
      });
    });
  }

  // ----------------------------------
  // GoogleAPI認証
  // ----------------------------------
  authorize(credentials) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const OAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
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
            fs.writeFile(this.config.tokenPath, JSON.stringify(token), (err) => {
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
      scope: this.config.scopes,
    });

    console.log('認証URL:', authURL);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve, reject) => {
      rl.question('認証トークン:', (code) => {
        rl.close();
        OAuth2Client.getToken(code, (err, token) => {
          if (err) {
            return console.log('トークンを発行できません', err);
          }
          OAuth2Client.setCredentials(token);

          // 発行したトークンを出力
          fs.writeFile(this.config.tokenPath, JSON.stringify(token), (err) => {
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
        auth: this.config.auth,
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

// Global Variable
var today = moment().utcOffset('+09:00');
var todayMax = moment().utcOffset('+09:00');
var params = {};
moment.tz.setDefault('Asia/Tokyo');
const gcal = new GoogleCalendar();

// ----------------------------------
// 日時再更新
// ----------------------------------
const DateRefresh = () => {
  today = moment(moment().format('YYYY-MM-DD')).utcOffset('+09:00');
  todayMax = moment(moment().format('YYYY-MM-DD')).add(1, 'days').add(-1, 'minutes').utcOffset('+09:00');

  // 当日のイベント一覧
  params = {
    calendarId: calendarID,
    timeMax: todayMax.format(),
    timeMin: today.format(),
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: 'Asia/Tokyo',
  };
};

// ----------------------------------
// Google Calendar 接続
// ----------------------------------
const GetEvent = () => {
  gcal
    .connect()
    .then(() => {
      // 当日のイベント
      return gcal.EventLists(params);
    })
    .then((events) => {
      EventList(events);
    });
};

// ----------------------------------
// 今日のイベント一覧
// ----------------------------------
const EventList = (events) => {
  let overflow = false;
  let list = '【本日のイベント一覧】\n';
  let last = 'イベントがいっぱいで紹介しきれません!\n';
  last += 'その他のイベント情報は公式サイトをチェック✨\n';
  last += 'https://vrceve.com/';

  // イベント数分だけループ
  if (events.length) {
    events.some((event) => {
      let start = moment(event.start.dateTime).format('HH:mm');
      let tmp = list;
      tmp += `${start} 開始🎉 - ${event.summary}\n`;

      // ツイートが140文字超えたらカレンダーへ誘導
      if (tmp.length + last.length > 140) {
        list = tmp + last;
        overflow = true;
        return true;
      }
      list = tmp;
    });
  } else {
    list += '何も登録されていないみたいです...';
  }

  // 140文字を超えてなければ後文言変更
  if (!overflow) {
    last = '他の日のイベント情報は公式サイトをチェック✨\n';
    last += 'https://vrceve.com/';
    list += last;
  }
  console.log(list);
};

// 日付リセット
DateRefresh();
// イベント取得
GetEvent();
