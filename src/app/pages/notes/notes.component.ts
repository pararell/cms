import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { finalize } from 'rxjs/operators';
import { Apiservice, NotePayload } from '../../services/api.service';
import { SignalStore } from '../../services/signal-store';
import { prepareSlug } from '../../utils/page-utils';
import { CalendarComponent } from '../../components/calendar/calendar.component';
import {
  CalendarDay,
  CalendarMonth,
  createCalendar,
  markCalendarsWithNotes,
} from '../../utils/calendar-utils';

interface Note {
  id: number;
  title: string;
  slug: string;
  content?: string;
  categories?: string;
  position?: string;
  hidden?: string;
  date?: string;
}

interface NoteView extends Note {
  color?: string;
  safeContent: SafeHtml;
}

const COLOR_PALETTE = [
  'teal',
  'olive',
  'maroon',
  'purple',
  'grey',
  'orange',
  'green',
  'blue',
  'red',
  'coral',
  'darkgoldenrod',
  'indianred',
  '#112d4b',
];

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CalendarComponent],
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesComponent {
  private readonly api = inject(Apiservice);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(SignalStore);
  private readonly sanitizer = inject(DomSanitizer);

  readonly user = this.store.user;

  private readonly notesSignal = signal<Note[]>([]);
  readonly allNotes = computed(() => this.notesSignal());

  readonly selectedCategory = signal('all');
  readonly showAddModal = signal(false);
  readonly showEditModal = signal(false);
  readonly showCalendarNotesModal = signal(false);

  readonly loading = signal(false);
  readonly pending = signal(false);
  readonly deletePending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  private readonly currentNoteId = signal<number | null>(null);
  private readonly currentNoteSlug = signal<string | null>(null);

  readonly categories = computed(() => {
    const notes = this.notesSignal();
    const set = new Set<string>();
    notes.forEach((note) => {
      (note.categories || '')
        .split(',')
        .map((cat) => cat.trim())
        .filter(Boolean)
        .forEach((cat) => set.add(cat));
    });
    return ['all', ...Array.from(set)];
  });

  readonly calendars = computed<CalendarMonth[]>(() =>
    markCalendarsWithNotes(createCalendar(), this.notesSignal())
  );

  readonly notes = computed<NoteView[]>(() => {
    const selected = this.selectedCategory();
    const categories = this.categories();
    return this.notesSignal()
      .filter((note) => note.hidden !== 'true')
      .filter((note) => {
        if (selected === 'all') {
          return true;
        }
        if (!note.categories) {
          return false;
        }
        return note.categories.split(',').map((cat) => cat.trim()).includes(selected);
      })
      .map((note) => this.decorateNote(note, categories))
      .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
  });

  readonly calendarNotes = signal<NoteView[]>([]);

  readonly searchForm = this.fb.nonNullable.group({
    edit: [''],
  });

  readonly addForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    content: [''],
    categories: [''],
    position: ['0'],
    hidden: ['false'],
    date: [''],
  });

  readonly editForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    content: [''],
    categories: [''],
    position: ['0'],
    hidden: ['false'],
    date: [''],
  });

  constructor() {
    this.loadNotes();

    this.route.queryParamMap.subscribe((params) => {
      const slug = params.get('edit');
      if (slug) {
        this.searchForm.patchValue({ edit: slug }, { emitEvent: false });
        this.loadNote(slug);
        this.showEditModal.set(true);
      } else {
        this.currentNoteId.set(null);
        this.currentNoteSlug.set(null);
      }
    });

    effect(() => {
      if (!this.showEditModal()) {
        this.successMessage.set(null);
        this.errorMessage.set(null);
      }
    });
  }

  onCategoryChange(category: string) {
    this.selectedCategory.set(category || 'all');
  }

  openAddModal() {
    if (!this.user()?.email) {
      return;
    }
    this.resetAddForm();
    this.showAddModal.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  openEditModal() {
    if (!this.user()?.email) {
      return;
    }
    this.showEditModal.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.clearEditQuery();
  }

  closeCalendarNotesModal() {
    this.showCalendarNotesModal.set(false);
    this.calendarNotes.set([]);
  }

  onSearch() {
    const slug = this.searchForm.controls.edit.value?.trim();
    if (!slug) {
      this.clearEditQuery();
      return;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { edit: slug },
      queryParamsHandling: 'merge',
    });
  }

  submitNewNote() {
    if (this.addForm.invalid || this.pending()) {
      this.addForm.markAllAsTouched();
      return;
    }

    const payload = this.prepareNotePayload(this.addForm.getRawValue());

    this.pending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.api
      .createNote(payload)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe((response: any) => {
        if (response?.error) {
          this.errorMessage.set('Unable to create note.');
          return;
        }
        this.successMessage.set('Note created successfully.');
        this.closeAddModal();
        this.loadNotes();
      });
  }

  submitUpdatedNote() {
    if (this.editForm.invalid || this.pending()) {
      this.editForm.markAllAsTouched();
      return;
    }

    const id = this.currentNoteId();
    if (!id) {
      this.errorMessage.set('Select a note before saving.');
      return;
    }

    const payload = this.prepareNotePayload({ ...this.editForm.getRawValue(), id });

    this.pending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.api
      .updateNote(payload)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe((response: any) => {
        if (response?.error) {
          this.errorMessage.set('Unable to update note.');
          return;
        }
        this.successMessage.set('Note updated successfully.');
        this.loadNotes();
        const nextSlug = String(response?.slug ?? payload.slug ?? '');
        const nextId = Number(response?.id ?? id);
        this.currentNoteSlug.set(nextSlug || this.currentNoteSlug());
        this.currentNoteId.set(Number.isNaN(nextId) ? this.currentNoteId() : nextId);
        if (nextSlug) {
          this.loadNote(nextSlug);
        }
      });
  }

  deleteNote() {
    if (this.deletePending()) {
      return;
    }

    const id = this.currentNoteId();
    if (!id) {
      return;
    }

    this.deletePending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.api
      .deleteNote(id)
      .pipe(finalize(() => this.deletePending.set(false)))
      .subscribe((response: any) => {
        if (response?.error) {
          this.errorMessage.set('Unable to delete note.');
          return;
        }
        this.successMessage.set('Note deleted successfully.');
        this.closeEditModal();
        this.loadNotes();
      });
  }

  selectNote(note: NoteView) {
    if (!this.user()?.email) {
      return;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { edit: note.slug },
      queryParamsHandling: 'merge',
    });
    this.showEditModal.set(true);
  }

  openCalendarNote({ day, calendar }: { day: CalendarDay; calendar: CalendarMonth }) {
    const date = `${calendar.year}-${calendar.monthTwoDigits}-${day.valueTwoDigits}`;
    const categories = this.categories();
    const notesForDate = this.notesSignal()
      .filter((note) => String(note.date ?? '').startsWith(date))
      .map((note) => this.decorateNote(note, categories));

    if (notesForDate.length) {
      this.calendarNotes.set(notesForDate);
      this.showCalendarNotesModal.set(true);
    }
  }

  private loadNotes() {
    if (this.loading()) {
      return;
    }
    this.loading.set(true);
    this.api
      .getNotes()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((response: any) => {
        if (Array.isArray(response)) {
          this.notesSignal.set(response as Note[]);
          return;
        }
        this.notesSignal.set([]);
        if (response?.error) {
          this.errorMessage.set('Unable to load notes.');
        }
      });
  }

  private loadNote(slug: string) {
    if (!slug) {
      return;
    }
    this.api.getNote(slug).subscribe((response: any) => {
      if (!response || response?.error) {
        this.errorMessage.set('Unable to load selected note.');
        return;
      }
      this.currentNoteId.set(Number(response.id));
      this.currentNoteSlug.set(String(response.slug ?? slug));
      this.editForm.patchValue({
        title: String(response.title ?? ''),
        content: String(response.content ?? ''),
        categories: String(response.categories ?? ''),
        position: String(response.position ?? '0'),
        hidden: String(response.hidden ?? 'false'),
        date: String(response.date ?? ''),
      });
    });
  }

  private decorateNote(note: Note, categories: string[]): NoteView {
    const firstCategory = (note.categories || '')
      .split(',')
      .map((cat) => cat.trim())
      .filter(Boolean)[0];
    const categoryIndex = firstCategory ? Math.max(categories.indexOf(firstCategory) - 1, 0) : -1;
    const color = categoryIndex >= 0 ? COLOR_PALETTE[categoryIndex % COLOR_PALETTE.length] : undefined;

    return {
      ...note,
      color,
      safeContent: this.sanitizer.bypassSecurityTrustHtml(String(note.content ?? '')),
    } satisfies NoteView;
  }

  private prepareNotePayload(formValue: Record<string, unknown>): NotePayload {
    const title = String(formValue['title'] ?? '').trim();
    return {
      title,
      content: String(formValue['content'] ?? ''),
      categories: String(formValue['categories'] ?? ''),
      position: String(formValue['position'] ?? '0'),
      hidden: String(formValue['hidden'] ?? 'false'),
      date: String(formValue['date'] ?? ''),
      slug: prepareSlug(title),
      id: typeof formValue['id'] === 'number' ? formValue['id'] : undefined,
    };
  }

  private resetAddForm() {
    const today = new Date().toISOString().slice(0, 10);
    this.addForm.reset({
      title: '',
      content: '',
      categories: '',
      position: '0',
      hidden: 'false',
      date: today,
    });
  }

  private clearEditQuery() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { edit: null },
      queryParamsHandling: 'merge',
    });
  }
}
