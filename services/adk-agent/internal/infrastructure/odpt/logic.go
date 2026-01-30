package odpt

import (
    "regexp"
    "strings"
)

var (
    reSuspended = regexp.MustCompile(`(運転見合わせ|見合せ|運転見合せ|運転中止|運休|運転を見合わせ)`)
    reDelay     = regexp.MustCompile(`(遅れ|遅延|ダイヤ乱れ|運転間隔が乱れ|一部運休|列車に遅れ|運転本数が少なく|運行状況|お知らせがあります)`)
    reNormal    = regexp.MustCompile(`(平常運転|通常運転|ほぼ平常どおり|おおむね平常|見合わせていましたが|再開しました)`)
)

func DeriveStatus(text string) string {
    text = strings.TrimSpace(text)
    if text == "" {
        return "unknown"
    }

    if reSuspended.MatchString(text) {
        return "suspended"
    }
    if reDelay.MatchString(text) {
        return "delay"
    }
    if reNormal.MatchString(text) {
        return "normal"
    }
    return "unknown"
}
