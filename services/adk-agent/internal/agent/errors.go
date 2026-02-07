package agent

import "strings"

func friendlyAgentError(locale string) string {
	if strings.HasPrefix(locale, "ja") {
		return "申し訳ありません。現在リクエストを処理できません。少し時間をおいて再試行してください。"
	}
	if strings.HasPrefix(locale, "zh") {
		return "抱歉，目前無法完成此請求，請稍後再試。"
	}
	return "Sorry, I cannot process this request right now. Please try again shortly."
}
