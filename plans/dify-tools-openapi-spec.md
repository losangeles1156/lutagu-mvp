# Dify Tools OpenAPI 3.0 規格文件

> **版本**: 1.1.0
> **格式**: OpenAPI 3.0 (可用於 Dify 工具匯入)
> **最後更新**: 2026-01-05

---

## 檔案說明

此文件為 YAML 格式，您可以直接將下方程式碼區塊複製並儲存為 `dify/dify-tools-v3.yaml`，然後匯入至 Dify 後台作為工具定義。

---

## OpenAPI YAML 規格

```yaml
openapi: 3.0.0
info:
  title: LUTAGU Dify Tools
  description: OpenAPI specification for LUTAGU Dify Agent tools
  version: 1.1.0
servers:
  - url: https://lutagu.vercel.app
    description: Production server

paths:
  /api/util/time:
    get:
      operationId: get_japan_time
      summary: Get Japan Time and Period
      description: Returns current date, time, and period (morning_rush, evening_rush, day, late_night) in Tokyo. Use this to check if user is travelling during rush hour.
      tags:
        - Utility
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  jst_time:
                    type: string
                    example: "2026-01-05 11:35:00"
                  hour_jst:
                    type: integer
                    example: 11
                  period:
                    type: string
                    enum:
                      - morning_rush
                      - day
                      - evening_rush
                      - late_night
                    example: "day"
                  day_of_week:
                    type: string
                    example: "Monday"

  /api/weather/live:
    get:
      operationId: get_weather
      summary: Get Tokyo Real-time Weather
      description: Returns current weather condition and temperature in Tokyo.
      tags:
        - Utility
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  weather:
                    type: string
                    example: "晴れ"
                  temp:
                    type: number
                    example: 12.5
                  humidity:
                    type: integer
                    example: 45
                  icon:
                    type: string
                    example: "sunny"

  /api/odpt/route:
    get:
      operationId: search_route
      summary: Search Transit Route with Fare
      description: Finds route between two stations. Returns multiple route options including duration, transfers, and fare. CORE tool for route planning.
      tags:
        - Transit
      parameters:
        - name: from
          in: query
          required: true
          description: Origin station name (Japanese or English)
          schema:
            type: string
            example: "上野"
        - name: to
          in: query
          required: true
          description: Destination station name
          schema:
            type: string
            example: "銀座"
        - name: datetime
          in: query
          required: false
          description: Departure time in ISO 8601 format
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: Successful response with route options
          content:
            application/json:
              schema:
                type: object
                properties:
                  routes:
                    type: array
                    items:
                      type: object
                      properties:
                        distance:
                          type: number
                        duration:
                          type: integer
                        transfers:
                          type: integer
                        fare:
                          type: integer
                        from:
                          type: string
                        to:
                          type: string
                        legs:
                          type: array
                          items:
                            type: object
                            properties:
                              line:
                                type: string
                              from:
                                type: string
                              to:
                                type: string
                              departure_time:
                                type: string
                              arrival_time:
                                type: string

  /api/odpt/train-status:
    get:
      operationId: get_train_status
      summary: Get Train Operation Status
      description: Returns delay and suspension information for major Tokyo train lines.
      tags:
        - Transit
      parameters:
        - name: operator
          in: query
          required: false
          description: Filter by operator (e.g., "JR-East", "TokyoMetro")
          schema:
            type: string
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: array
                    items:
                      type: object
                      properties:
                        operator:
                          type: string
                        line:
                          type: string
                        status:
                          type: string
                          enum:
                            - normal
                            - delay
                            - suspended
                        delay_minutes:
                          type: integer
                          nullable: true
                        description:
                          type: string
                          nullable: true

  /api/station/context:
    get:
      operationId: get_station_context
      summary: Get Station Context
      description: Returns comprehensive station information including facilities, POIs, vibe tags, and busy level.
      tags:
        - Station
      parameters:
        - name: station_id
          in: query
          required: true
          description: Station ID in ODPT format
          schema:
            type: string
            example: "odpt.Station:JR-East.Ueno"
        - name: locale
          in: query
          required: false
          description: Response language
          schema:
            type: string
            enum:
              - ja
              - en
              - zh-TW
            default: "ja"
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  station_id:
                    type: string
                  busy_level:
                    type: string
                    enum:
                      - Quiet
                      - Moderate
                      - Busy
                      - Very Busy
                  annual_journeys:
                    type: integer
                  vibe_tags:
                    type: object
                  facilities:
                    type: object
                    properties:
                      toilets:
                        type: array
                        items:
                          type: string
                      elevators:
                        type: array
                        items:
                          type: string
                      lockers:
                        type: array
                        items:
                          type: string
                  nearby_pois:
                    type: array
                    items:
                      type: object
                      properties:
                        name:
                          type: string
                        distance:
                          type: string
                        type:
                          type: string
                  active_alerts:
                    type: array

  /api/l4/knowledge:
    get:
      operationId: search_expert_knowledge
      summary: Search Expert Knowledge Base
      description: Searches the expert knowledge base for transit tips, accessibility advice, pass recommendations, and crowd avoidance strategies.
      tags:
        - Knowledge
      parameters:
        - name: type
          in: query
          required: true
          description: Type of knowledge to search
          schema:
            type: string
            enum:
              - railway
              - station
              - accessibility
              - location
              - passes
              - crowd
        - name: id
          in: query
          required: false
          description: Station or railway ID to filter by
          schema:
            type: string
        - name: tags
          in: query
          required: false
          description: Comma-separated tags to filter
          schema:
            type: string
        - name: locale
          in: query
          required: false
          description: Response language
          schema:
            type: string
            enum:
              - ja
              - en
              - zh-TW
            default: "ja"
      responses:
        '200':
          description: Successful response with expert tips
          content:
            application/json:
              schema:
                type: object
                properties:
                  type:
                    type: string
                  station_id:
                    type: string
                  tips:
                    type: array
                    items:
                      type: object
                      properties:
                        title:
                          type: string
                        content:
                          type: string
                        tags:
                          type: array
                          items:
                            type: string
                        accessibility_note:
                          type: string
                  count:
                    type: integer

tags:
  - name: Utility
    description: General utility tools (time, weather)
  - name: Transit
    description: Transit-related tools (routes, status)
  - name: Station
    description: Station-specific information
  - name: Knowledge
    description: Expert knowledge base
```

---

## Dify 匯入步驟

1. 將上方 YAML 程式碼複製，儲存為 `dify/dify-tools-v3.yaml`
2. 登入 Dify 後台 (`https://dify-k7m9.zeabur.app`)
3. 进入 **Tools** → **Create Tool** → **Import from YAML**
4. 上傳 `dify-tools-v3.yaml` 檔案
5. 確認 6 個工具已成功匯入

---

## 工具對照表

| # | Operation ID | 工具名稱 | 端點 |
|---|--------------|----------|------|
| 1 | get_japan_time | 日本時間與時段 | GET /api/util/time |
| 2 | get_weather | 即時天氣 | GET /api/weather/live |
| 3 | search_route | 路徑規劃 (含票價) | GET /api/odpt/route |
| 4 | get_train_status | 運行狀態 | GET /api/odpt/train-status |
| 5 | get_station_context | 車站上下文 | GET /api/station/context |
| 6 | search_expert_knowledge | 專家知識庫 | GET /api/l4/knowledge |
