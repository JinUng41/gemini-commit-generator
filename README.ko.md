# gemini-commit-generator 🤖

`gcg`는 git 저장소에서 staged 변경 사항, 최근 커밋 히스토리, 현재 브랜치 맥락을 참고해 Gemini CLI로 커밋 메시지를 만들어주는 AI 커밋 도구입니다.

[English](./README.md) | **한국어**

## 사전 요구 사항
1. [Node.js](https://nodejs.org/) `18+`
2. [Gemini CLI](https://github.com/google/gemini-cli) 가 설치되어 있고 `gemini` 명령어로 실행 가능해야 합니다.
3. 터미널에서 Gemini CLI 로그인을 한 번 완료해야 합니다.

## 설치
```bash
npm install -g @devjinung41/gemini-commit-generator
```

현재 저장소 소스로 바로 연결해 개발용으로 쓰려면:
```bash
npm link
```

## 빠른 시작
1. 커밋에 넣을 파일을 먼저 stage 합니다.
```bash
git add path/to/file
```

2. git 저장소 안에서 `gcg`를 실행합니다.
```bash
gcg
```

3. 언어를 고르고, 필요하면 추가 맥락을 입력한 뒤 아래 중 하나를 선택합니다.
- `Commit`
- `Regenerate`
- `Edit`로 편집기를 열고, 수정한 메시지가 유효하면 바로 커밋
- `Cancel`

## 기본 동작
- 기본적으로 현재 staged 변경 사항만 사용합니다.
- 전체 변경을 자동으로 stage 하려면 git 루트의 `.gcgrc.json`에 `autoStage: true`를 설정하세요.
- 브랜치 안전성 검사는 기본적으로 활성화되어 있습니다.
- Gemini가 사용하기 어려운 출력을 반환하면 자동으로 한 번 다시 생성합니다.

## 문서
상세 문서는 현재 영어로 제공됩니다.

- [Getting Started](./docs/getting-started.md)
- [Configuration](./docs/configuration.md)
- [Workflow](./docs/workflow.md)
- [Validation](./docs/validation.md)
- [Troubleshooting](./docs/troubleshooting.md)

## 라이선스
MIT
