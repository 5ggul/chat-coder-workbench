# Chat Coder Workbench 사용법

이 저장소는 일반 ChatGPT 대화에서 Luna Chat Coder 정책을 먼저 로드한 뒤, 사용자가 지정한 GitHub 저장소를 실제 개발 대상으로 삼기 위한 전용 workbench입니다.

## 새 대화에서 시작하는 가장 간단한 방법

아래처럼 workbench와 실제 대상 저장소를 함께 지정합니다.

```text
workbench: https://github.com/5ggul/chat-coder-workbench
대상: pm-lab

Luna로 작업해.
전체 구조와 프로젝트 지침을 먼저 읽고 다음 작업을 수행해:
<원하는 작업>

가능하면 샌드박스에서 수정·빌드·테스트하고 GitHub에 반영해.
외부 실행환경이 실제로 필요한 경우에만 GitHub Actions를 사용해.
```

`대상: pm-lab`처럼 저장소 이름만 적으면 연결된 계정의 `5ggul/pm-lab`로 해석합니다. 다른 소유자의 저장소나 특정 PR/브랜치를 작업할 때는 전체 GitHub URL 또는 `OWNER/REPO`를 적습니다.

## 더 짧게 쓰기

같은 대화에서 workbench가 이미 로드된 뒤에는 다음처럼 요청해도 됩니다.

```text
대상: filetools
모바일에서 깨지는 UI 찾아서 수정하고 테스트 후 GitHub에 반영해.
```

또는:

```text
대상: 5ggul/calctool
전체 SEO 구조를 점검하고 실제 코드 문제를 고쳐. 테스트까지 하고 PR 만들어.
```

## 기본 동작

1. 먼저 이 저장소의 `AGENTS.md`와 `.agents/skills/luna-chat-coder/SKILL.md`를 읽습니다.
2. 실제 작업 대상은 사용자가 지정한 GitHub 저장소입니다.
3. 대상 저장소 자체의 `AGENTS.md`, README, CONTRIBUTING, package/build 설정을 추가로 읽고 프로젝트별 규칙을 따릅니다.
4. 정확한 대상 commit/PR head를 확인한 뒤, 저장소 전체 수정·빌드·테스트가 필요하면 해당 상태를 샌드박스 작업공간으로 가져옵니다.
5. 일반적인 수정·빌드·테스트·디버깅은 샌드박스에서 수행합니다.
6. 필요한 패키지·SDK·실행환경·전송 제약 등 실제 gap이 있을 때만 GitHub Actions를 보조 경로로 사용합니다.
7. 소스 변경은 기본적으로 별도 작업 브랜치에서 수행하고 draft PR로 게시합니다. 사용자가 기본 브랜치 직접 반영이나 즉시 merge를 명시한 경우에만 그 요청을 따릅니다.
8. `반영해`, `적용해`, `수정해서 올려` 같은 표현은 요청된 변경을 GitHub에 게시해도 된다는 뜻으로 처리합니다.
9. 실제로 수행한 테스트와 확인 결과만 보고합니다.

## 권장 요청 형식

```text
workbench: https://github.com/5ggul/chat-coder-workbench
대상: <저장소 이름 또는 URL>

목표:
<완성되어야 하는 결과>

조건:
- 기존 기능 깨지지 않게
- 관련 코드 전체 확인
- 가능한 테스트 실행
- 문제 있으면 원인까지 수정
- 완료 후 GitHub에 반영
```

별도의 상세 구현 계획을 사용자가 작성할 필요는 없습니다. 목표와 제약을 주면 에이전트가 대상 저장소의 실제 구조를 읽고 구현 방법을 결정합니다.

## 예시

```text
workbench: https://github.com/5ggul/chat-coder-workbench
대상: pm-lab

Luna로 작업해. 전체 구조를 먼저 읽고 dashboard.py에서 모바일 UI가 깨지는 원인을 찾아 수정해. 가능한 테스트까지 하고 변경사항을 GitHub에 반영해.
```

대상 저장소가 ChatGPT의 GitHub 연결에서 읽기/쓰기 가능해야 하며, Actions fallback을 쓸 경우에는 해당 대상 저장소에서 Actions 관련 권한도 사용할 수 있어야 합니다.
