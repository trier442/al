# WordPress 원고 작성 방법

이 폴더의 HTML 파일은 GitHub Actions를 통해 모두의 국어 WordPress로 전송됩니다.

## 파일 상단 정보

```html
<!-- title: 게시글 제목 -->
<!-- slug: 영문-또는-한글-주소 -->
<!-- status: draft -->
<!-- type: post -->
<!-- categories: 26,1 -->
<!-- excerpt: 검색 결과에 표시할 설명 -->
<!-- featured_image: wordpress-content/images/example.png -->
```

그 아래에는 WordPress 본문에 들어갈 HTML만 작성합니다.

- `status: draft`: 초안 저장
- `status: publish`: 즉시 공개
- `type: post`: 게시글
- `type: page`: 페이지
- `categories`: WordPress 카테고리 ID를 쉼표로 구분
- `featured_image`: 생략 가능

같은 `slug`가 이미 존재하면 새 글을 만들지 않고 기존 글을 갱신합니다.

## 필요한 GitHub Secrets

저장소의 Settings → Secrets and variables → Actions에서 설정합니다.

- `WP_URL`: `https://modukorean.co.kr`
- `WP_USERNAME`: WordPress 사용자명
- `WP_APP_PASSWORD`: WordPress 애플리케이션 비밀번호

애플리케이션 비밀번호는 원고나 코드에 직접 적지 않습니다.

## 클릭형 문제 스타일 기준

클릭형 객관식 선택지는 WordPress 테마의 버튼 색상에 덮어쓰이지 않도록 기본 상태에 `color: #111 !important;`를 반드시 지정합니다. 정답·오답을 선택한 뒤에는 각각 초록색·빨간색 상태 색상을 적용합니다.
