# 报告 PDF 中文字体

`NotoSansSC-Regular.ttf` 是 Noto Sans SC 的静态 400 字重，供浏览器生成 PDF 时按需从本站加载，无运行时 CDN 请求。完整保留上游的 31,036 个字形、30,890 个 Unicode 码位及全部 cmap 表，未按报告示例文字裁剪。

- 上游：[Google Fonts / Noto Sans SC](https://github.com/google/fonts/tree/a85815a42757630ce188fdad368c2dfc444d4773/ofl/notosanssc)
- 固定 commit：`a85815a42757630ce188fdad368c2dfc444d4773`
- 源字体：`ofl/notosanssc/NotoSansSC[wght].ttf`，版本 `2.004-H2`，17,772,300 字节
- 静态字体：10,595,932 字节（约 10.1 MiB），字体内部名称 `Noto Sans SC Regular`
- 转换工具：Python 3.13.1、FontTools 4.61.1
- 授权：[SIL Open Font License 1.1](./OFL.txt)。原许可证声明的保留字体名称为 `Source`；此实例使用 `Noto Sans SC`，保留原版权与许可证。

## SHA-256

| 文件 | SHA-256 |
| --- | --- |
| 上游 `NotoSansSC[wght].ttf` | `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da` |
| `NotoSansSC-Regular.ttf` | `eeb06b8a64fd04a2744d95579db1571b51027cda61ed78c62e4b730791525461` |
| `OFL.txt`（上游原文） | `1c05c68c34f9708415aada51f17e1b0092d2cea709bf4a94cd38114f9e73d7d9` |

## 复现

在前端仓库根目录执行。仅固定字重并更新字体名称，不使用子集工具；保留源时间戳以得到一致的字体校验值。

```sh
python3 -m venv /tmp/teacher-assistant-fonts-venv
/tmp/teacher-assistant-fonts-venv/bin/python -m pip install 'fonttools==4.61.1'

noto_source_commit=a85815a42757630ce188fdad368c2dfc444d4773
curl --fail --location "https://raw.githubusercontent.com/google/fonts/${noto_source_commit}/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf" --output /tmp/NotoSansSC-variable.ttf
curl --fail --location "https://raw.githubusercontent.com/google/fonts/${noto_source_commit}/ofl/notosanssc/OFL.txt" --output public/fonts/OFL.txt

/tmp/teacher-assistant-fonts-venv/bin/fonttools varLib.instancer \
  --static --update-name-table --no-recalc-timestamp \
  /tmp/NotoSansSC-variable.ttf wght=400 \
  --output public/fonts/NotoSansSC-Regular.ttf

shasum -a 256 /tmp/NotoSansSC-variable.ttf public/fonts/NotoSansSC-Regular.ttf public/fonts/OFL.txt
```

字体仍遵循 OFL 1.1；生成的 PDF 文档不因此被要求使用 OFL 授权。
