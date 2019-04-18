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
var today = moment().utcOffset('+09:00');
var todayMax = moment().utcOffset('+09:00');
var weeks = moment().utcOffset('+09:00');
var weeksMax = moment().utcOffset('+09:00');

var params = {};
var mode = false;
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

  weeks = moment(moment().format('YYYY-MM-DD'))
    .add(1, 'weeks')
    .utcOffset('+09:00');
  weeksMax = moment(moment().format('YYYY-MM-DD'))
    .add(1, 'weeks')
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

  // 来週のイベント
  _params = {
    calendarId: calendarID,
    timeMax: weeksMax.format(),
    timeMin: weeks.format(),
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

  // 差分取得
  const m_diff = now.diff(morning, 'minutes');

  // 0: 通常
  // 1: 当日一覧告知
  mode = false;
  if (m_diff >= 0 && m_diff < 15) {
    // 6時00分頃なら当日の告知
    mode = true;
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
      // 当日のイベント
      return gcal.EventLists(params);
    })
    .then(events => {
      if (mode) {
        EventList(events);
        EventListNextWeeks();
      } else {
        EventDetail(events);
      }
    });
};

// ----------------------------------
// Google Calendar 接続 翌週
// ----------------------------------
const GetEventNextWeeks = () => {
  gcal
    .connect()
    .then(() => {
      // 当日のイベント
      return gcal.EventLists(_params);
    })
    .then(events => {
      EventListNextWeeks(events);
    });
};
// ----------------------------------
// 今日のイベント一覧
// ----------------------------------
const EventList = events => {
  let overflow = false;
  let list = '【本日のイベント一覧】\n';
  let last = 'イベントがいっぱいで紹介しきれません!\n';
  last += 'その他のイベント情報は公式サイトをチェック✨\n';
  last += 'https://sites.google.com/view/vrchat-event';

  // イベント数分だけループ
  if (events.length) {
    events.some(event => {
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
    last += 'https://sites.google.com/view/vrchat-event';
    list += last;
  }
  console.log(list);
  // Twitter投稿
  Posting(list);
};

// ----------------------------------
// 来週のイベント一覧
// ----------------------------------
const EventListNextWeeks = events => {
  let overflow = false;
  let list = '【1週間後のイベント一覧】\n';
  let last = '詳細は公式サイトをチェック✨';
  last += 'https://sites.google.com/view/vrchat-event';

  // イベント数分だけループ
  if (events.length) {
    events.some(event => {
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

  console.log(list);
  // Twitter投稿
  Posting(list);
};

// ----------------------------------
// 開始30分前のイベント詳細
// ----------------------------------
const EventDetail = events => {
  if (events.length) {
    events.some(event => {
      let start = moment(event.start.dateTime);
      let end = moment(event.end.dateTime);
      let diff = start.diff(now, 'minutes');
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
