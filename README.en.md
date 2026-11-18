# Qimen Mingpan (奇门命盘)

A Qimen Dunjia (奇门遁甲) chart generator in **one offline HTML file**. Pick any Beijing time, get the chart and a score for each of the 12 double-hours of the day.

**[Live demo](https://senhu8888-oss.github.io/qimen-mingpan/)** | [Download `dist/index.html`](dist/index.html) | [中文说明](README.md)

## Features

- **Qimen Dunjia chart**: hour-based rotating chart with three methods you can switch between (Chai Bu, Zhi Run, Mao Shan).
- **Birth chart**: BaZi (Ten Gods, Na Yin, Luck Pillars), Ming Gua and a personal fortune view from birth data.
- **Zi Wei Dou Shu**: basic natal chart from birth time.
- **Plum Blossom Numerology (Meihua Yishu)**: number and time divination, plus the 64 hexagrams.
- **Solar terms accurate to the minute**: computed with VSOP87, within 1 minute of the Hong Kong Observatory's 2026 data.
- **No dependencies, works offline**: double-click the HTML file. MIT licensed.

## Run locally

```bash
node build.js   # rebuild dist/index.html from src/
npm test        # run all tests
```

## Notes

This is a cultural and educational project. Qimen Dunjia is not scientifically validated and should not be used for important decisions. The scoring rules are this project's own, not taken from classical texts. If the chart differs from a source you trust, please open an issue with the time, your source and the difference (see [VERIFY.md](VERIFY.md)).
