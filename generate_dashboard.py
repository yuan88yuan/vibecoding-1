import urllib.request
import xml.etree.ElementTree as ET
import json

def fetch_rss(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
        root = ET.fromstring(xml_data)
        news = []
        for item in root.findall('./channel/item')[:10]:
            title = item.find('title').text if item.find('title') is not None else 'No Title'
            link = item.find('link').text if item.find('link') is not None else '#'
            pubDate = item.find('pubDate').text if item.find('pubDate') is not None else 'Unknown Date'
            news.append({
                'title': title,
                'link': link,
                'pubDate': pubDate
            })
        return news
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return []

tech_news = fetch_rss('https://techcrunch.com/feed/')
stock_news = fetch_rss('https://finance.yahoo.com/news/rssindex')

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly News Digest</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        h1 {{
            text-align: center;
            color: #333;
        }}
        .container {{
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .tabs {{
            display: flex;
            margin-bottom: 20px;
            border-bottom: 2px solid #ddd;
        }}
        .tab-btn {{
            padding: 10px 20px;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 16px;
            font-weight: bold;
            color: #666;
        }}
        .tab-btn.active {{
            color: #007bff;
            border-bottom: 2px solid #007bff;
            margin-bottom: -2px;
        }}
        .search-bar {{
            width: 100%;
            padding: 10px;
            margin-bottom: 20px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 16px;
        }}
        .news-list {{
            list-style: none;
            padding: 0;
        }}
        .news-item {{
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
        }}
        .news-title {{
            font-size: 18px;
            margin: 0 0 5px 0;
        }}
        .news-link {{
            text-decoration: none;
            color: #007bff;
        }}
        .news-link:hover {{
            text-decoration: underline;
        }}
        .news-date {{
            font-size: 12px;
            color: #888;
        }}
        .tab-content {{
            display: none;
        }}
        .tab-content.active {{
            display: block;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Weekly News Digest</h1>

        <input type="text" id="searchInput" class="search-bar" placeholder="Search news...">

        <div class="tabs">
            <button class="tab-btn active" onclick="openTab('tech')">Technology</button>
            <button class="tab-btn" onclick="openTab('stocks')">Stock Market</button>
        </div>

        <div id="tech" class="tab-content active">
            <ul class="news-list">
                {''.join(f'''
                <li class="news-item">
                    <h3 class="news-title"><a href="{item['link']}" class="news-link" target="_blank">{item['title']}</a></h3>
                    <div class="news-date">{item['pubDate']}</div>
                </li>
                ''' for item in tech_news)}
            </ul>
        </div>

        <div id="stocks" class="tab-content">
            <ul class="news-list">
                {''.join(f'''
                <li class="news-item">
                    <h3 class="news-title"><a href="{item['link']}" class="news-link" target="_blank">{item['title']}</a></h3>
                    <div class="news-date">{item['pubDate']}</div>
                </li>
                ''' for item in stock_news)}
            </ul>
        </div>
    </div>

    <script>
        function openTab(tabName) {{
            const tabContents = document.getElementsByClassName("tab-content");
            for (let i = 0; i < tabContents.length; i++) {{
                tabContents[i].classList.remove("active");
            }}
            const tabBtns = document.getElementsByClassName("tab-btn");
            for (let i = 0; i < tabBtns.length; i++) {{
                tabBtns[i].classList.remove("active");
            }}

            document.getElementById(tabName).classList.add("active");
            event.currentTarget.classList.add("active");

            filterNews(); // Re-apply filter when switching tabs
        }}

        document.getElementById('searchInput').addEventListener('keyup', filterNews);

        function filterNews() {{
            const input = document.getElementById('searchInput').value.toLowerCase();
            const activeTab = document.querySelector('.tab-content.active');
            const newsItems = activeTab.getElementsByClassName('news-item');

            for (let i = 0; i < newsItems.length; i++) {{
                const title = newsItems[i].getElementsByClassName('news-title')[0].innerText.toLowerCase();
                if (title.indexOf(input) > -1) {{
                    newsItems[i].style.display = "";
                }} else {{
                    newsItems[i].style.display = "none";
                }}
            }}
        }}
    </script>
</body>
</html>
"""

import os
os.makedirs('weekly_news_digest', exist_ok=True)

with open('weekly_news_digest/index.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("Generated weekly_news_digest/index.html")
