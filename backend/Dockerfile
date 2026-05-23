FROM elixir:1.18-otp-27-alpine AS build

RUN apk add --no-cache build-base git

WORKDIR /app

ENV MIX_ENV=prod

RUN mix local.hex --force && mix local.rebar --force

COPY mix.exs ./
RUN mix deps.get --only prod
RUN mkdir config
COPY config/config.exs config/prod.exs config/runtime.exs config/
RUN mix deps.compile

COPY lib lib
COPY priv priv

RUN mix compile
RUN mix release

FROM alpine:3.22 AS app

RUN apk add --no-cache openssl ncurses-libs libstdc++ poppler-utils curl

WORKDIR /app

ENV HOME=/app
ENV MIX_ENV=prod

COPY --from=build /app/_build/prod/rel/minha_casa_ai ./

EXPOSE 4000

CMD ["/app/bin/minha_casa_ai", "start"]
