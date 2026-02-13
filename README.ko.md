# gemini-commit-generator 🤖

Google Gemini CLI를 사용하여 프로젝트의 스타일을 학습하고 고품질의 커밋 메시지를 생성하는 범용 AI 커밋 도구입니다. 별도의 설정 없이 즉시 사용할 수 있습니다.

[English](./README.md) | **한국어**

## ✨ 주요 특징
- **제로 설정 (Zero Config)**: `git history`를 분석하여 프로젝트의 언어, 형식(Conventional Commits, Prefix 등), 어조를 자동으로 감지합니다.
- **맥락 인식 (Context Aware)**: 커밋의 "이유"를 설명하는 사용자의 추가 입력을 반영하여 더 정확한 메시지를 만듭니다.
- **대화형 인터페이스 (Interactive)**: 커밋 전 메시지를 검토하고, 다시 생성하거나, 직접 수정할 수 있는 메뉴를 제공합니다.
- **범용성 (Universal)**: 한국어, 영어 등 모든 언어를 지원하며 프로젝트 고유의 컨벤션을 그대로 따릅니다.

## 🚀 설치 방법

### 사전 요구 사항
[Gemini CLI](https://github.com/google/gemini-cli)가 설치되어 있고 설정이 완료되어 있어야 합니다.

### 빠른 설치 (macOS/Linux)
터미널에서 다음 명령어를 실행하세요:
```bash
curl -sSL https://raw.githubusercontent.com/JinUng41/gemini-commit-generator/main/aic.sh -o /usr/local/bin/aic && chmod +x /usr/local/bin/aic
```

## 💡 사용 방법
어느 git 저장소에서나 `aic`를 입력하세요:
```bash
aic
```

1. 모든 변경사항을 스테이징합니다 (`git add .`).
2. 이번 커밋에 대한 추가 설명(맥락)을 입력받습니다 (선택 사항).
3. Gemini가 코드 변경점과 과거 기록을 분석하여 메시지를 제안합니다.
4. **Commit**, **Regenerate**, **Edit**, **Update**, **Cancel** 중 하나를 선택합니다.

## 🔄 업데이트
최신 기능과 프롬프트 개선 사항을 반영하려면 다음 명령어를 실행하세요:
```bash
aic --update
```

## 📄 라이선스
이 프로젝트는 MIT 라이선스를 따릅니다.
