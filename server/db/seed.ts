import bcrypt from 'bcryptjs';
import { getDatabase } from './database';
import {
  initialItems,
  initialMazarPrograms,
  initialBannerSlides,
  initialPrayerItems,
} from '../../src/data/initialData';
import { INITIAL_INFALLIBLES } from '../../src/data/initialImamologyData';
import { initialBooks } from '../../src/utils/libraryStorage';
import { initialMadahiList } from '../../src/data/initialMadahi';

export async function seedInitialData(): Promise<void> {
  const db = getDatabase();

  // 1. Seed Initial Controller Account (with hashed password 'Mohammad128')
  const existingController = await db.execute({
    sql: 'SELECT id FROM accounts WHERE role = ?',
    args: ['controller'],
  });

  if (existingController.rows.length === 0) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('Mohammad128', saltRounds);

    await db.execute({
      sql: `INSERT INTO accounts (
        id, name, nickname, role, email_or_phone, badge_title, password_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'ctrl-master-1',
        'کنترل‌گر سامانه مزار',
        'مدیر مزار',
        'controller',
        'admin@mazar.ir',
        'کنترل‌گر ارشد مزار',
        passwordHash,
        new Date().toISOString(),
      ],
    });
    console.log('[Seed] Initial Controller account created with hashed password (Mohammad128).');
  }

  // 2. Seed Default Settings
  const existingSettings = await db.execute('SELECT id FROM settings WHERE id = ?', ['default']);
  if (existingSettings.rows.length === 0) {
    await db.execute({
      sql: `INSERT INTO settings (
        id, system_title, allow_retake, show_correct_immediately, require_name, is_matam_mode, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'default',
        'سامانه تعاملی مزار شهدای گمنام',
        1,
        1,
        1,
        0,
        new Date().toISOString(),
      ],
    });
    console.log('[Seed] Default settings created.');
  }

  // 3. Seed Content Items if empty
  const existingItems = await db.execute('SELECT COUNT(*) as count FROM content_items');
  if (Number(existingItems.rows[0].count) === 0) {
    for (const item of initialItems) {
      await db.execute({
        sql: `INSERT INTO content_items (
          id, type, title, content, category, options_json, correct_option_index,
          points, explanation, estimated_read_minutes, sub_questions_json,
          poll_votes_json, is_published, display_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          item.id,
          item.type,
          item.title,
          item.content,
          item.category,
          item.options ? JSON.stringify(item.options) : null,
          item.correctOptionIndex ?? null,
          item.points ?? 0,
          item.explanation ?? null,
          item.estimatedReadMinutes ?? null,
          item.subQuestions ? JSON.stringify(item.subQuestions) : null,
          item.pollVotes ? JSON.stringify(item.pollVotes) : null,
          item.isPublished ? 1 : 0,
          item.order,
          item.createdAt,
        ],
      });
    }
    console.log(`[Seed] ${initialItems.length} initial content items seeded.`);
  }

  // 4. Seed Mazar Programs if empty
  const existingPrograms = await db.execute('SELECT COUNT(*) as count FROM mazar_programs');
  if (Number(existingPrograms.rows[0].count) === 0) {
    for (const prog of initialMazarPrograms) {
      await db.execute({
        sql: `INSERT INTO mazar_programs (
          id, day, title, time, description, speaker_or_maddah, location, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          prog.id,
          prog.day,
          prog.title,
          prog.time ?? null,
          prog.description ?? null,
          prog.speakerOrMaddah ?? null,
          prog.location ?? null,
          prog.createdAt,
        ],
      });
    }
    console.log(`[Seed] ${initialMazarPrograms.length} mazar programs seeded.`);
  }

  // 5. Seed Banner Slides if empty
  const existingBanners = await db.execute('SELECT COUNT(*) as count FROM banner_slides');
  if (Number(existingBanners.rows[0].count) === 0) {
    for (const banner of initialBannerSlides) {
      await db.execute({
        sql: `INSERT INTO banner_slides (
          id, image_url, title, subtitle, link_url, display_order, is_published, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          banner.id,
          banner.imageUrl,
          banner.title ?? null,
          banner.subtitle ?? null,
          banner.linkUrl ?? null,
          banner.order,
          banner.isPublished ? 1 : 0,
          banner.createdAt,
        ],
      });
    }
    console.log(`[Seed] ${initialBannerSlides.length} banner slides seeded.`);
  }

  // 6. Seed Prayers if empty
  const existingPrayers = await db.execute('SELECT COUNT(*) as count FROM prayers');
  if (Number(existingPrayers.rows[0].count) === 0) {
    for (const prayer of initialPrayerItems) {
      await db.execute({
        sql: `INSERT INTO prayers (
          id, title, subtitle, arabic_text, persian_translation, audio_url,
          reciter, duration, category, display_order, is_published, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          prayer.id,
          prayer.title,
          prayer.subtitle ?? null,
          prayer.arabicText,
          prayer.persianTranslation ?? null,
          prayer.audioUrl ?? null,
          prayer.reciter ?? null,
          prayer.duration ?? null,
          prayer.category ?? null,
          prayer.order,
          prayer.isPublished ? 1 : 0,
          prayer.createdAt,
        ],
      });
    }
    console.log(`[Seed] ${initialPrayerItems.length} prayers seeded.`);
  }

  // 7. Seed Infallibles (Imamology) if empty
  const existingInfallibles = await db.execute('SELECT COUNT(*) as count FROM infallibles');
  if (Number(existingInfallibles.rows[0].count) === 0) {
    for (const person of INITIAL_INFALLIBLES) {
      await db.execute({
        sql: `INSERT INTO infallibles (
          id, display_order, name, title, epithet, kunya, father_name, mother_name,
          birth_date, birth_place, martyrdom_date, martyrdom_place, imamat_period,
          biography, virtues, hadith_json, special_ziyarah
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          person.id,
          person.order,
          person.name,
          person.title,
          person.epithet,
          person.kunya,
          person.fatherName,
          person.motherName,
          person.birthDate,
          person.birthPlace,
          person.martyrdomDate,
          person.martyrdomPlace,
          person.imamatPeriod ?? null,
          person.biography,
          person.virtues,
          JSON.stringify(person.hadith),
          person.specialZiyarahSnippet ?? null,
        ],
      });
    }
    console.log(`[Seed] ${INITIAL_INFALLIBLES.length} Infallible entries seeded.`);
  }

  // 8. Seed Library Books if empty
  const existingBooks = await db.execute('SELECT COUNT(*) as count FROM library_books');
  if (Number(existingBooks.rows[0].count) === 0) {
    for (const b of initialBooks) {
      await db.execute({
        sql: `INSERT INTO library_books (
          id, title, author, description, cover_url, content_text, pdf_url, pdf_file_name, category, is_published, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          b.id,
          b.title,
          b.author,
          b.description || '',
          b.coverUrl || '',
          b.textContent || '',
          b.pdfUrl || '',
          b.pdfFileName || null,
          b.category || 'عمومی',
          b.isPublished !== false ? 1 : 0,
          b.createdAt,
        ],
      });
    }
    console.log(`[Seed] ${initialBooks.length} Library Books seeded.`);
  }

  // 9. Seed Nava Madahi tracks if empty
  const existingNava = await db.execute('SELECT COUNT(*) as count FROM nava_madahi');
  if (Number(existingNava.rows[0].count) === 0) {
    for (const m of initialMadahiList) {
      await db.execute({
        sql: `INSERT INTO nava_madahi (
          id, title, maddah, category, audio_url, cover_url, duration, description, is_published, display_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          m.id,
          m.title,
          m.maddah,
          m.category,
          m.audioUrl,
          m.coverUrl || '',
          m.duration || '۰۴:۰۰',
          m.description || '',
          m.isPublished !== false ? 1 : 0,
          m.order ?? 0,
          m.createdAt,
        ],
      });
    }
    console.log(`[Seed] ${initialMadahiList.length} Nava madahi tracks seeded.`);
  }
}
