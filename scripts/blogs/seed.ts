import { BlogCategoriesService } from '../../src/modules/blogs/categories/blog-categories.service';
import { categoryKey } from '../../src/modules/blogs/categories/category-name';
import sharp from 'sharp';

import { envs } from '../../src/config';
import { AdminBlogsService } from '../../src/modules/blogs/admin-blogs.service';
import { BlogAssetsService } from '../../src/modules/blogs/assets/blog-assets.service';
import { BlogPostStatus } from '../../src/modules/blogs/dto';
import { runCli } from '../api-keys/_bootstrap';
import { seedBlogPosts, seedCovers, SeedCover } from './seed-data';

const SEED_FILE_PREFIX = 'seed-blog-';

void runCli('BlogSeed', async (app) => {
  if (envs.stage !== 'dev') {
    throw new Error('Blog seed is restricted to STAGE=dev');
  }

  const postsService = app.get(AdminBlogsService);
  const assetsService = app.get(BlogAssetsService);
  const coverIds = new Map<string, string>();
  const coverAltByKey = new Map<string, string>();
  for (const seed of seedBlogPosts) {
    coverAltByKey.set(seed.coverKey, seed.coverAlt);
  }
  const existingAssets = await assetsService.findAll();

  let createdAssets = 0;
  for (const cover of seedCovers) {
    const originalName = `${SEED_FILE_PREFIX}${cover.key}.webp`;
    const coverAlt = coverAltByKey.get(cover.key);
    if (!coverAlt) throw new Error(`Missing seed cover alt ${cover.key}`);
    let asset = existingAssets.find(
      (candidate) => candidate.originalName === originalName,
    );

    if (!asset) {
      const buffer = await renderCover(cover);
      asset = await assetsService.upload(
        multerFile(originalName, buffer),
        coverAlt,
      );
      createdAssets += 1;
    } else if (asset.altText !== coverAlt) {
      await assetsService.updateAltText(asset.id, coverAlt);
      asset = { ...asset, altText: coverAlt };
    }
    coverIds.set(cover.key, asset.id);
  }

  const categories = app.get(BlogCategoriesService);
  const known = new Set(
    (await categories.findAll()).map((category) => category.key),
  );
  for (const seed of seedBlogPosts) {
    const key = categoryKey(seed.category);
    if (!known.has(key)) {
      await categories.create({ name: seed.category, position: 0 });
      known.add(key);
    }
  }

  const existingPosts = await postsService.findAll({});
  let createdPosts = 0;
  let updatedPosts = 0;
  let publishedPosts = 0;

  for (const seed of seedBlogPosts) {
    const coverAssetId = coverIds.get(seed.coverKey);
    if (!coverAssetId) throw new Error(`Missing seed cover ${seed.coverKey}`);

    const input = {
      locale: seed.locale,
      slug: seed.slug,
      title: seed.title,
      excerpt: seed.excerpt,
      contentMarkdown: seed.contentMarkdown,
      category: seed.category,
      tags: seed.tags,
      featured: seed.featured ?? false,
      coverAssetId,
    };
    const existing = existingPosts.find(
      (post) => post.locale === String(seed.locale) && post.slug === seed.slug,
    );

    const post = existing
      ? await postsService.update(existing.id, input)
      : await postsService.create(input);
    if (existing) updatedPosts += 1;
    else createdPosts += 1;

    if (post.status !== BlogPostStatus.PUBLISHED) {
      await postsService.publish(post.id);
      publishedPosts += 1;
    }
  }

  console.log(
    [
      `Seed complete: ${createdAssets} assets created`,
      `${createdPosts} posts created`,
      `${updatedPosts} posts updated`,
      `${publishedPosts} posts published`,
    ].join(', '),
  );
});

async function renderCover(cover: SeedCover): Promise<Buffer> {
  const svg = `
    <svg width="1600" height="900" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
      <rect width="1600" height="900" fill="${cover.background}"/>
      <circle cx="1320" cy="180" r="330" fill="${cover.accent}" opacity="0.16"/>
      <circle cx="320" cy="790" r="430" fill="${cover.accent}" opacity="0.11"/>
      <path d="M180 610 C 470 260, 850 760, 1420 300" fill="none" stroke="${cover.accent}" stroke-width="36" stroke-linecap="round"/>
      <rect x="150" y="135" width="410" height="116" rx="58" fill="${cover.accent}"/>
      <rect x="225" y="181" width="260" height="24" rx="12" fill="${cover.background}" opacity="0.9"/>
    </svg>`;

  return sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
}

function multerFile(originalName: string, buffer: Buffer): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: originalName,
    encoding: '7bit',
    mimetype: 'image/webp',
    size: buffer.byteLength,
    buffer,
    destination: '',
    filename: originalName,
    path: '',
    stream: undefined as never,
  };
}
