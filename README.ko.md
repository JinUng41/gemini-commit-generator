# gemini-commit-generator 🤖

Node.js 기반으로 모든 운영체제를 지원하는 지능형 AI 커밋 도구입니다. 프로젝트의 스타일을 학습하여 최적의 커밋 메시지를 제안합니다.

[English](./README.md) | **한국어**

## ✨ 주요 특징
- **크로스 플랫폼**: macOS, Linux, Windows 어디서나 Node.js만 있다면 동작합니다.
- **제로 설정**: `git history`를 분석하여 프로젝트의 컨벤션을 자동으로 감지합니다.
- **맥락 인식**: 사용자의 추가 설명을 반영하여 더 정확한 메시지를 만듭니다.
- **대화형 메뉴**: 커밋 전 메시지를 검토하고 수정할 수 있습니다.

## 🚀 설치 방법

### 사전 요구 사항
1. [Node.js](https://nodejs.org/) (v14 이상)
2. [Gemini CLI](https://github.com/google/gemini-cli)

### npm으로 설치 (글로벌)
```bash
npm install -g @jinung41/gemini-commit-generator
```

## 💡 사용 방법
어느 git 저장소에서나 `gcg`를 입력하세요:
```bash
gcg
```

## 🔄 업데이트
```bash
npm update -g @jinung41/gemini-commit-generator
```

## 🗑️ 삭제
```bash
npm uninstall -g @jinung41/gemini-commit-generator
```

## 📄 라이선스
이 프로젝트는 MIT 라이선스를 따릅니다.
