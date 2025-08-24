import { Router, Request, Response } from "express";
import Parser from "rss-parser";
import { MESSAGES } from "../constants/messages";
import { ROUTES } from "../constants/routes";

const router = Router();

// 이미지와 본문 요약 가져오기 위해 customFields 설정
const parser = new Parser({
  customFields: {
    item: ["content:encoded", "enclosure"]
  }
});

interface SteamNewsItem {
  title: string;
  link: string;
  pubDate: string;
  snippet: string;
  image?: string;
}

/** ----------------------------------------
 * 뉴스 크롤링
 ---------------------------------------- */
router.get(ROUTES.NEWS.NEWSALL, async (req: Request, res: Response) => {
  try {
    const feed = await parser.parseURL("https://store.steampowered.com/feeds/news.xml");

    const items: SteamNewsItem[] = feed.items.map((item: any) => {
      // 이미지 추출
      let imageUrl;
      if (item.enclosure?.url) {
        imageUrl = item.enclosure.url;
      } else if (item["content:encoded"]) {
        const match = item["content:encoded"].match(/<img.*?src="(.*?)"/);
        if (match) imageUrl = match[1];
      }

      // 본문 요약 (HTML 태그 제거 + 최대 200자까지만 잘라냄)
      let snippet = "";
      if (item["content:encoded"]) {
        snippet = item["content:encoded"]
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 200);
      }

      return {
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        snippet,
        image: imageUrl
      };
    });

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

export default router;
