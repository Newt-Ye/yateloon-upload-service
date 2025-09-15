## 檔案上傳功能（Upload to External API）

此功能開發目的為：

- 使用 Node.js Express 建立一組上傳 API
- 接收前端上傳的檔案並儲存在指定資料夾

### 功能項目
- 支援動態指定資料夾儲存（透過 `req.query.folder`）
- 回傳檔案 URL 給後端儲存