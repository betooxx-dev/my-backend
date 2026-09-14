/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import sharp from 'sharp';

export function blogAdminScenarios(
  context: () => { app: NestExpressApplication; token: string },
) {
  it('manages categories with normalization, ordering, cascade and reference protection', async () => {
    const { app, token } = context();
    const api = request(app.getHttpServer());
    const auth = `Bearer ${token}`;
    await api.get('/api/blog/admin/categories').expect(401);
    await api
      .post('/api/blog/admin/categories')
      .set('Authorization', auth)
      .send({ name: '  Tecnología   personal ', position: 3 })
      .expect(201);
    await api
      .post('/api/blog/admin/categories')
      .set('Authorization', auth)
      .send({ name: 'TECNOLOGIA-PERSONAL', position: 0 })
      .expect(409);
    await api
      .post('/api/blog/admin/categories')
      .set('Authorization', auth)
      .send({ name: '!!!', position: 0 })
      .expect(400);
    const created = await api
      .post('/api/blog/admin/posts')
      .set('Authorization', auth)
      .send({
        locale: 'es',
        slug: 'category-qa',
        title: 'QA',
        excerpt: 'QA',
        category: 'tecnologia personal',
      })
      .expect(201);
    const id = created.body.data.id as string;
    expect(created.body.data.category).toBe('Tecnología personal');
    await api
      .delete(
        '/api/blog/admin/categories/' +
          encodeURIComponent('Tecnología personal'),
      )
      .set('Authorization', auth)
      .expect(409);
    await api
      .patch(
        '/api/blog/admin/categories/' +
          encodeURIComponent('Tecnología personal'),
      )
      .set('Authorization', auth)
      .send({ name: 'Sistemas personales', position: 2 })
      .expect(200);
    const updated = await api
      .get('/api/blog/admin/posts/' + id)
      .set('Authorization', auth)
      .expect(200);
    expect(updated.body.data.category).toBe('Sistemas personales');
    await api
      .patch('/api/blog/admin/posts/' + id)
      .set('Authorization', auth)
      .send({ category: 'Missing' })
      .expect(400);
    await api
      .delete('/api/blog/admin/posts/' + id)
      .set('Authorization', auth)
      .expect(200);
    await api
      .delete('/api/blog/admin/categories/Sistemas%20personales')
      .set('Authorization', auth)
      .expect(200);
  });

  it('returns actual cover alt in mutations and lists, protects exact Markdown references and removes published posts', async () => {
    const { app, token } = context();
    const api = request(app.getHttpServer());
    const auth = `Bearer ${token}`;
    const image = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#123456' },
    })
      .png()
      .toBuffer();
    const uploaded = await api
      .post('/api/blog/admin/assets')
      .set('Authorization', auth)
      .field('altText', 'Un cuadrado azul')
      .attach('file', image, { filename: 'qa.png', contentType: 'image/png' })
      .expect(201);
    const assetId = uploaded.body.data.id as string;
    const created = await api
      .post('/api/blog/admin/posts')
      .set('Authorization', auth)
      .send({
        locale: 'en',
        slug: 'alt-qa',
        title: 'Alt QA',
        excerpt: 'Alt QA',
        category: 'General',
        contentMarkdown: 'Body',
        coverAssetId: assetId,
      })
      .expect(201);
    const id = created.body.data.id as string;
    expect(created.body.data.coverAlt).toBe('Un cuadrado azul');
    await api
      .post(`/api/blog/admin/posts/${id}/publish`)
      .set('Authorization', auth)
      .expect(201);
    const published = await api.get('/api/blog/posts/en/alt-qa').expect(200);
    expect(published.body.data.coverAlt).toBe('Un cuadrado azul');
    const list = await api.get('/api/blog/posts?locale=en').expect(200);
    expect(
      list.body.data.find((post: { id: string }) => post.id === id).coverAlt,
    ).toBe('Un cuadrado azul');
    await api
      .delete('/api/blog/admin/assets/' + assetId)
      .set('Authorization', auth)
      .expect(409);
    await api
      .delete('/api/blog/admin/assets/' + assetId.toUpperCase())
      .set('Authorization', auth)
      .expect(409);
    await api
      .post(`/api/blog/admin/posts/${id}/unpublish`)
      .set('Authorization', auth)
      .expect(201);
    await api
      .patch('/api/blog/admin/posts/' + id)
      .set('Authorization', auth)
      .send({
        coverAssetId: null,
        contentMarkdown: `![alt](/api/blog/assets/${assetId.toUpperCase()})`,
      })
      .expect(200);
    await api
      .delete('/api/blog/admin/assets/' + assetId)
      .set('Authorization', auth)
      .expect(409);
    await api
      .patch('/api/blog/admin/posts/' + id)
      .set('Authorization', auth)
      .send({ contentMarkdown: `Bare UUID: ${assetId}` })
      .expect(200);
    await api
      .delete('/api/blog/admin/assets/' + assetId)
      .set('Authorization', auth)
      .expect(200);
    await api
      .patch('/api/blog/admin/posts/' + id)
      .set('Authorization', auth)
      .send({ contentMarkdown: `![gone](/api/blog/assets/${assetId})` })
      .expect(409);
    await api
      .delete('/api/blog/admin/posts/' + id)
      .set('Authorization', auth)
      .expect(200);
    await api.get('/api/blog/posts/en/alt-qa').expect(404);
  });
  it('serializes saving Markdown references against concurrent asset deletion', async () => {
    const { app, token } = context();
    const api = request(app.getHttpServer());
    const auth = `Bearer ${token}`;
    const image = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#123456' },
    })
      .png()
      .toBuffer();
    const uploaded = await api
      .post('/api/blog/admin/assets')
      .set('Authorization', auth)
      .field('altText', 'Race QA')
      .attach('file', image, { filename: 'race.png', contentType: 'image/png' })
      .expect(201);
    const assetId = uploaded.body.data.id as string;
    const created = await api
      .post('/api/blog/admin/posts')
      .set('Authorization', auth)
      .send({
        locale: 'en',
        slug: 'race-qa',
        title: 'Race QA',
        excerpt: 'QA',
        category: 'General',
      })
      .expect(201);
    const id = created.body.data.id as string;
    const [save, deletion] = await Promise.all([
      api
        .patch('/api/blog/admin/posts/' + id)
        .set('Authorization', auth)
        .send({ contentMarkdown: `![alt](/api/blog/assets/${assetId})` }),
      api
        .delete('/api/blog/admin/assets/' + assetId)
        .set('Authorization', auth),
    ]);
    expect([
      [200, 409],
      [409, 200],
    ]).toContainEqual([save.status, deletion.status]);
    await api
      .delete('/api/blog/admin/posts/' + id)
      .set('Authorization', auth)
      .expect(200);
    if (deletion.status === 409)
      await api
        .delete('/api/blog/admin/assets/' + assetId)
        .set('Authorization', auth)
        .expect(200);
  });
}
