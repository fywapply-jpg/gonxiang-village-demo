#!/usr/bin/env node

const base = String(process.env.SHUZHI_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
const checks = [];
const add = (ok, name, detail) => {
  checks.push({ ok, name, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`);
};

if (!base) {
  add(false, "公网地址配置", "请设置 SHUZHI_PUBLIC_BASE_URL，例如 https://example.com/gonxiang-village-demo");
} else {
  let parsedBase;
  try {
    parsedBase = new URL(`${base}/`);
    add(parsedBase.protocol === "https:", "公网 HTTPS", parsedBase.protocol === "https:" ? "使用 HTTPS" : `当前协议为 ${parsedBase.protocol}`);
  } catch {
    add(false, "公网地址配置", "地址格式不正确");
  }

  const fetchText = async (path, absolutePath = false) => {
    const url = absolutePath
      ? new URL(path, `${parsedBase.origin}/`).toString()
      : new URL(path.replace(/^\/+/, ""), `${base}/`).toString();
    const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000) });
    const body = await response.text();
    return { response, body, url };
  };
  const pages = [
    ["/", "根入口"],
    ["/app.html", "手机入口"],
    ["/shuzhi/app.html", "/shuzhi/兼容入口"],
    ["/admin.html", "后台入口"],
  ];
  for (const [path, label] of pages) {
    try {
      const { response, body, url } = await fetchText(path);
      add(response.ok, `${label} HTTP`, `${response.status} ${url}`);
      if (!response.ok) continue;
      const isAdmin = path === "/admin.html";
      const expected = isAdmin ? "数智供社 v8533" : "v8533";
      add(body.includes(expected), `${label} 版本`, body.includes(expected) ? "已标识 v8533" : "未发现 v8533");
      add(!body.includes("供享村社") && !body.includes("数智供销"), `${label} 品牌隔离`, "未混入历史品牌");
    } catch (error) {
      add(false, `${label} 可访问`, error instanceof Error ? error.message : String(error));
    }
  }

  try {
    const { body } = await fetchText("/app.html");
    const refs = [...body.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map((match) => match[1].split(/[?#]/, 1)[0])
      .filter((ref) => ref && !/^(?:https?:|data:|javascript:|#)/.test(ref));
    let missing = 0;
    for (const ref of refs) {
      try {
        const { response, url } = await fetchText(ref, ref.startsWith("/"));
        if (!response.ok) { missing += 1; console.log(`FAIL  手机入口资源  ${response.status} ${url}`); }
      } catch (error) {
        missing += 1;
        console.log(`FAIL  手机入口资源  ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    add(missing === 0, "手机入口资源闭包", missing === 0 ? `${refs.length} 个资源均可访问` : `${missing} 个资源无法访问`);
  } catch (error) {
    add(false, "手机入口资源闭包", error instanceof Error ? error.message : String(error));
  }
}

const failed = checks.filter((item) => !item.ok).length;
console.log(`\n数智供社 v8533 公网回验：${checks.length - failed} 通过，${failed} 失败`);
process.exitCode = failed ? 1 : 0;
