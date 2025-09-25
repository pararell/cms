import { CommonModule, isPlatformBrowser } from '@angular/common';
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
import { finalize } from 'rxjs/operators';
import { Apiservice, ExpensePayload } from '../../services/api.service';
import { SignalStore } from '../../services/signal-store';
import { prepareSlug } from '../../utils/page-utils';
import { PLATFORM_ID } from '@angular/core';

interface Expense {
  id: number;
  title: string;
  slug: string;
  description?: string;
  value?: string | number;
  categories?: string;
  repeat?: string;
  currency?: string;
  lastPayment?: string;
}

interface ExpenseView extends Expense {
  valueEur: number;
  displayValue: string;
  color?: string;
}

interface ExchangeRatesResponse {
  [base: string]: Record<string, number>;
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
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesComponent {
  private readonly api = inject(Apiservice);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(SignalStore);
  private readonly platformId = inject(PLATFORM_ID);

  readonly user = this.store.user;

  private readonly expensesSignal = signal<Expense[]>([]);
  private readonly exchangeRates = signal<ExchangeRatesResponse | null>(null);

  readonly allExpenses = computed(() => this.expensesSignal());

  readonly selectedCategory = signal('all');
  readonly showAddModal = signal(false);
  readonly showEditModal = signal(false);

  readonly loading = signal(false);
  readonly pending = signal(false);
  readonly deletePending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  private readonly currentExpenseId = signal<number | null>(null);
  private readonly currentExpenseSlug = signal<string | null>(null);

  readonly categories = computed(() => {
    const expenses = this.expensesSignal();
    const set = new Set<string>();
    expenses.forEach((expense) => {
      (expense.categories || '')
        .split(',')
        .map((cat) => cat.trim())
        .filter(Boolean)
        .forEach((cat) => set.add(cat));
    });
    return ['all', ...Array.from(set)];
  });

  readonly expenses = computed<ExpenseView[]>(() => {
    const expenses = this.expensesSignal();
    const category = this.selectedCategory();
    const categories = this.categories();
    const exchangeRates = this.exchangeRates();

    return expenses
      .filter((expense) => {
        if (category === 'all') {
          return true;
        }
        if (!expense.categories) {
          return false;
        }
        return expense.categories.split(',').map((cat) => cat.trim()).includes(category);
      })
      .map((expense) => {
        const currency = String(expense.currency || 'eur').toLowerCase();
        const rawValue = Number.parseFloat(String(expense.value ?? 0)) || 0;
        const rate = exchangeRates?.['eur']?.[currency];
        const valueEur = currency === 'eur' || !rate ? rawValue : rawValue / rate;

        const firstCategory = (expense.categories || '')
          .split(',')
          .map((cat) => cat.trim())
          .filter(Boolean)[0];
        const categoryIndex = firstCategory ? Math.max(categories.indexOf(firstCategory) - 1, 0) : -1;
        const color = categoryIndex >= 0 ? COLOR_PALETTE[categoryIndex % COLOR_PALETTE.length] : undefined;

        return {
          ...expense,
          valueEur,
          displayValue: valueEur.toFixed(2),
          color,
        } satisfies ExpenseView;
      })
      .sort((a, b) => b.valueEur - a.valueEur);
  });

  readonly summary = computed(() => {
    const expenses = this.expenses();
    const total = expenses.reduce((sum, expense) => sum + expense.valueEur, 0);
    return total.toFixed(2);
  });

  readonly searchForm = this.fb.nonNullable.group({
    edit: [''],
  });

  readonly addForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    value: ['', Validators.required],
    description: [''],
    categories: [''],
    repeat: [''],
    currency: ['eur'],
    lastPayment: [''],
  });

  readonly editForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    value: ['', Validators.required],
    description: [''],
    categories: [''],
    repeat: [''],
    currency: ['eur'],
    lastPayment: [''],
  });

  constructor() {
    this.loadExpenses();
    if (isPlatformBrowser(this.platformId)) {
      this.loadExchangeRates();
    }

    this.route.queryParamMap.subscribe((params) => {
      const slug = params.get('edit');
      if (slug) {
        this.searchForm.patchValue({ edit: slug }, { emitEvent: false });
        this.loadExpense(slug);
        this.showEditModal.set(true);
      } else {
        this.currentExpenseId.set(null);
        this.currentExpenseSlug.set(null);
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

  submitNewExpense() {
    if (this.addForm.invalid || this.pending()) {
      this.addForm.markAllAsTouched();
      return;
    }

    const payload = this.prepareExpensePayload(this.addForm.getRawValue());

    this.pending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.api
      .createExpense(payload)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe((response: any) => {
        if (response?.error) {
          this.errorMessage.set('Unable to create expense.');
          return;
        }
        this.successMessage.set('Expense created successfully.');
        this.closeAddModal();
        this.loadExpenses();
      });
  }

  submitUpdatedExpense() {
    if (this.editForm.invalid || this.pending()) {
      this.editForm.markAllAsTouched();
      return;
    }

    const id = this.currentExpenseId();
    if (!id) {
      this.errorMessage.set('Select an expense before saving.');
      return;
    }

    const payload = this.prepareExpensePayload({ ...this.editForm.getRawValue(), id });

    this.pending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.api
      .updateExpense(payload)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe((response: any) => {
        if (response?.error) {
          this.errorMessage.set('Unable to update expense.');
          return;
        }
        this.successMessage.set('Expense updated successfully.');
        this.loadExpenses();
        const nextSlug = String(response?.slug ?? payload.slug ?? '');
        const nextId = Number(response?.id ?? id);
        this.currentExpenseSlug.set(nextSlug || this.currentExpenseSlug());
        this.currentExpenseId.set(Number.isNaN(nextId) ? this.currentExpenseId() : nextId);
        if (nextSlug) {
          this.loadExpense(nextSlug);
        }
      });
  }

  deleteExpense() {
    if (this.deletePending()) {
      return;
    }

    const id = this.currentExpenseId();
    if (!id) {
      return;
    }

    this.deletePending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.api
      .deleteExpense(id)
      .pipe(finalize(() => this.deletePending.set(false)))
      .subscribe((response: any) => {
        if (response?.error) {
          this.errorMessage.set('Unable to delete expense.');
          return;
        }
        this.successMessage.set('Expense deleted successfully.');
        this.closeEditModal();
        this.loadExpenses();
      });
  }

  selectExpense(expense: ExpenseView) {
    if (!this.user()?.email) {
      return;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { edit: expense.slug },
      queryParamsHandling: 'merge',
    });
    this.showEditModal.set(true);
  }

  private loadExpenses() {
    if (this.loading()) {
      return;
    }
    this.loading.set(true);
    this.api
      .getExpenses()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((response: any) => {
        if (Array.isArray(response)) {
          this.expensesSignal.set(response as Expense[]);
          return;
        }
        this.expensesSignal.set([]);
        if (response?.error) {
          this.errorMessage.set('Unable to load expenses.');
        }
      });
  }

  private loadExpense(slug: string) {
    if (!slug) {
      return;
    }
    this.api.getExpense(slug).subscribe((response: any) => {
      if (!response || response?.error) {
        this.errorMessage.set('Unable to load selected expense.');
        return;
      }
      this.currentExpenseId.set(Number(response.id));
      this.currentExpenseSlug.set(String(response.slug ?? slug));
      this.editForm.patchValue({
        title: String(response.title ?? ''),
        value: String(response.value ?? ''),
        description: String(response.description ?? ''),
        categories: String(response.categories ?? ''),
        repeat: String(response.repeat ?? ''),
        currency: String(response.currency ?? 'eur'),
        lastPayment: String(response.lastPayment ?? ''),
      });
    });
  }

  private loadExchangeRates() {
    this.api.getExchangeRates('eur').subscribe((response) => {
      if (response && typeof response === 'object') {
        this.exchangeRates.set(response as ExchangeRatesResponse);
      }
    });
  }

  private prepareExpensePayload(formValue: Record<string, unknown>): ExpensePayload {
    const title = String(formValue['title'] ?? '').trim();
    return {
      title,
      value: String(formValue['value'] ?? '').trim(),
      description: String(formValue['description'] ?? ''),
      categories: String(formValue['categories'] ?? ''),
      repeat: String(formValue['repeat'] ?? ''),
      currency: String(formValue['currency'] ?? 'eur'),
      lastPayment: String(formValue['lastPayment'] ?? ''),
      slug: prepareSlug(title),
      id: typeof formValue['id'] === 'number' ? formValue['id'] : undefined,
    };
  }

  private resetAddForm() {
    const today = new Date().toISOString().slice(0, 10);
    this.addForm.reset({
      title: '',
      value: '',
      description: '',
      categories: '',
      repeat: '',
      currency: 'eur',
      lastPayment: today,
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
