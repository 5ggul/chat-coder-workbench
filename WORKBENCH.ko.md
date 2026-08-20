# Chat Coder Workbench 사용법

이 저장소는 일반 ChatGPT 대화에서 Luna Chat Coder 정책을 먼저 로드한 뒤, 사용자가 지정한 GitHub 저장소를 실제 개발 대상으로 삼기 위한 전용 workbench입니다.

## 새 대화에서 시작하는 가장 간단한 방법

아래처럼 workbench와 실제 대상 저장소를 함께 지정합니다.

```text
workbench: https://github.com/5ggul/chat-coder-workbench
대상 저장소: https://github.com/OWNER/REPO

Luna 지침을 읽고 대상 저장소를 분석한 뒤 다음 작업을 해줘:
<원하는 작업>

가능하면 샌드박스에서 수정·빌드·테스트하고, 외부 실행환경이 실제로 필요한 경우에만 GitHub Actions를 사용해.
```

## 동작 원칙

1. 먼저 이 저장소의 `AGENTS.md`와 `.agents/skills/luna-chat-coder/SKILL.md`를 읽습니다.
2. 실제 작업 대상은 사용자가 지정한 다른 GitHub 저장소입니다.
3. 대상 저장소 자체의 `AGENTS.md`, README, CONTRIBUTING, package/build 설정을 추가로 읽고 프로젝트별 규칙을 따릅니다.
4. 저장소 전체 수정·빌드·테스트가 필요하면 정확한 대상 commit/PR head를 확인한 뒤 샌드박스 작업공간으로 가져와 작업합니다.
5. 샌드박스에서 충분히 할 수 있는 작업은 샌드박스에서 수행합니다.
6. 필요한 패키지·SDK·실행환경·전송 제약 등 실제 gap이 있을 때만 GitHub Actions를 보조 경로로 사용합니다.
7. 변경사항을 GitHub에 반영할 때는 사용자가 요청한 범위만 게시하고, 실제로 수행한 테스트 결과만 보고합니다.

## 예시

```text
workbench: https://github.com/5ggul/chat-coder-workbench
대상: https://github.com/5ggul/pm-lab

Luna로 작업해. 전체 구조를 먼저 읽고 dashboard.py에서 모바일 UI가 깨지는 원인을 찾아 수정해. 가능한 테스트까지 하고 변경사항을 GitHub에 반영해.
```

대상 저장소가 ChatGPT의 GitHub 연결에서 읽기/쓰기 가능해야 하며, Actions fallback을 쓸 경우에는 해당 대상 저장소에서 Actions 관련 권한도 사용할 수 있어야 합니다.
