# 自己动手实现一个区块链系统

## 1. 安装依赖

`npm install`

## 2. 启动应用

`node server.js`

## 3. 使用 Postman（或其他工具）测试 API

GET localhost:3000/chain

POST localhost:3000/transaction/new 其中 body 为 raw 格式，内容为 JSON 格式。

GET localhost:3000/mine
