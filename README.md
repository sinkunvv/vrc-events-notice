# vrc-events-notice

## イベント取得元
https://sites.google.com/view/vrchat-event  
https://twitter.com/nest_cuckoo_  

# 機能

## 30分前告知
イベント開始の30分前にカレンダーから取得した情報をTwitterで告知する  
* イベント名
* イベント開始、終了時間
* 備考記入事項

## 06時00分に今日のイベント一覧告知
毎日06時00分にその時点で登録されているイベント一覧をTwitterで告知する  
登録数が多くなって140文字制限に引っかかり始めたら対策予定  

## 23時30分に明日のイベント一覧告知
毎日23時30分にその時点で登録されている明日のイベント一覧をTwitterで告知する  
登録数が多くなって140文字制限に引っかかり始めたら対策予定  

# 仕様
## 必要な環境設定値

```
GOOGLE_CALENDAR_ID =  
GOOGLE_CLIENT_ID =  
GOOGLE_CLIENT_SECRET =  
GOOGLE_REDIRECT_URL =  
TWITTER_CONSUMER_KEY =  
TWITTER_CONSUMER_SECRET =  
TWITTER_TOKEN_KEY =  
TWITTER_TOKEN_SECRET =  
```

## 注意点
初回のみGoogleAPIへのアクセス認証が必要となるため  
ローカルで実行し、``g_token.json``を発行する必要あり  


### くれはるりさんの後継bot
今までお疲れ様でした。  

### 問い合わせ
https://twitter.com/sinkunvv  

## 使い方
1. Google API Consoleにアクセス
2. プロジェクトを作成する
3. Cloud Strage JSON API, Google Calendar APIを有効にする
4. 認証情報追加のプルダウンを開きOAuth2.0クライアントIDを選択する
5. 識別できる名前に変更し、タイプはその他にして作成する
6. noed local.jsで認証トークンを発行する
7. herokuにトークンを含めてpushする
8. herokuの環境設定値を設定する

