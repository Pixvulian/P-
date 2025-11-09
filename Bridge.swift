import Foundation
import WebKit

class Bridge: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "nativeFetch",
              let body = message.body as? [String: Any],
              let urlStr = body["url"] as? String,
              let url = URL(string: urlStr) else { return }

        var request = URLRequest(url: url)
        request.httpMethod = (body["method"] as? String) ?? "GET"

        if let headers = body["headers"] as? [String:String] {
            headers.forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }
        }
        if let b64 = body["body"] as? String, let data = Data(base64Encoded: b64) {
            request.httpBody = data
        }

        let task = URLSession.shared.dataTask(with: request) { data, _, _ in
            let text = String(data: data ?? Data(), encoding: .utf8) ?? ""
            let escaped = text
                .replacingOccurrences(of: "\\", with: "\\\\")
                .replacingOccurrences(of: "\n", with: "\\n")
                .replacingOccurrences(of: "'", with: "\\'")
            DispatchQueue.main.async {
                let js = "window.__nativeFetchCallback && window.__nativeFetchCallback('\(escaped)');"
                self.webView?.evaluateJavaScript(js, completionHandler: nil)
            }
        }
        task.resume()
    }
}