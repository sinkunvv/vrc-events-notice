('use strict');

// ----------------------------------
// Express Server
// ----------------------------------
const app = require('express')();

// ----------------------------------
// 初期設定
// ----------------------------------
const twitter = require('twitter');
const GoogleCalendar = require('./google_calendar');
const moment = require('moment-timezone');

const tw_token = {
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_TOKEN_SECRET
};

const client = new twitter(tw_token);
const gcal = new GoogleCalendar();
const calendarID = process.env.GOOGLE_CALENDAR_ID;

// Global Variable
var now = moment().utcOffset('+09:00');
var morning = moment().utcOffset('+09:00');
var night = moment().utcOffset('+09:00');
var today = moment().utcOffset('+09:00');
var todayMax = moment().utcOffset('+09:00');
var tommorow = moment().utcOffset('+09:00');
var tommorowMax = moment().utcOffset('+09:00');
var params = {};
var _params = {};
var mode = 0;
moment.tz.setDefault('Asia/Tokyo');

// ----------------------------------
// 日時再更新
// ----------------------------------
const DateRefresh = () => {
  today = moment(moment().format('YYYY-MM-DD')).utcOffset('+09:00');
  todayMax = moment(moment().format('YYYY-MM-DD'))
    .add(1, 'days')
    .add(-1, 'minutes')
    .utcOffset('+09:00');
  tommorow = moment(moment().format('YYYY-MM-DD'))
    .add(1, 'days')
    .utcOffset('+09:00');
  tommorowMax = moment(moment().format('YYYY-MM-DD'))
    .add(2, 'days')
    .add(-1, 'minutes')
    .utcOffset('+09:00');

  // 当日のイベント一覧
  params = {
    calendarId: calendarID,
    timeMax: todayMax.format(),
    timeMin: today.format(),
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: 'Asia/Tokyo'
  };

  // 翌日のイベント一覧
  _params = {
    calendarId: calendarID,
    timeMax: tommorowMax.format(),
    timeMin: tommorow.format(),
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: 'Asia/Tokyo'
  };

  // 現在日時
  now = moment().utcOffset('+09:00');
  morning = moment()
    .hour(6)
    .minutes(0)
    .utcOffset('+09:00');
  night = moment()
    .hour(23)
    .minutes(30)
    .utcOffset('+09:00');

  // 差分取得
  const m_diff = now.diff(morning, 'minutes');
  const n_diff = now.diff(night, 'minutes');

  // 0: 通常
  // 1: 当日一覧告知
  // 2: 翌日一覧告知
  mode = 0;
  if (m_diff >= 0 && m_diff < 15) {
    // 6時00分頃なら当日の告知
    mode = 1;
  } else if (n_diff >= 0 && n_diff < 15) {
    // 23時30分頃なら翌日の告知
    mode = 2;
  }
};
// ----------------------------------
// Twitter投稿
// ----------------------------------
const Posting = msg => {
  client.post(
    'statuses/update',
    {
      status: msg
    },
    (error, tweet, response) => {
      if (!error) {
        console.log('Tweet OK');
      } else {
        console.log('error:', error);
      }
    }
  );
};

// ----------------------------------
// Google Calendar 接続
// ----------------------------------
const GetEvent = () => {
  gcal
    .connect()
    .then(() => {
      if (mode == 2) {
        // 翌日のイベント
        return gcal.EventLists(_params);
      } else {
        // 当日のイベント
        return gcal.EventLists(params);
      }
    })
    .then(events => {
      if (mode != 0) {
        EventList(events);
      } else {
        EventDetail(events);
      }
    });
};

// ----------------------------------
// 今日のイベント一覧
// ----------------------------------
const EventList = events => {
  let list = '【本日のイベント一覧】\n';

  if (mode == 2) {
    list = '【明日のイベント一覧】\n';
  }

  // イベント数分だけループ
  if (events.length) {
    events.map((event, i) => {
      let start = moment(event.start.dateTime).format('HH:mm');
      let end = moment(event.end.dateTime).format('HH:mm');
      list += `${start} ~ ${end} : ${event.summary}\n`;
    });
  } else {
    list += '何も登録されていないみたいです...';
  }
  Posting(list);
};

// ----------------------------------
// 開始30分前のイベント詳細
// ----------------------------------
const EventDetail = events => {
  if (events.length) {
    events.map((event, i) => {
      let start = moment(event.start.dateTime);
      let end = moment(event.end.dateTime);
      let diff = start.diff(now, 'minutes');
      console.log(now);
      // 30分前
      if (diff > 15 && diff < 45) {
        let detail = '🎉【開始30分前】🎉\n';
        detail += `🕤${start.format('HH:mm')} ~ ${end.format('HH:mm')} \n`;
        detail += `✨${event.summary}✨\n`;

        // 備考スクレイピング
        let index = event.description.indexOf('【備考】');
        if (index !== -1) {
          detail += event.description.slice(index);
        }
        Posting(detail);
        console.log(detail);
      }
    });
  }
};

// ----------------------------------
// Express Server Listen
// ----------------------------------
app.get('/', (req, res) => {
  DateRefresh();
  console.log(now);
  res.send(GetEvent());
});
app.listen(process.env.PORT || 3000);
