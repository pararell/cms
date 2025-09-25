import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CalendarDay, CalendarMonth } from '../../utils/calendar-utils';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent {
  @Input({ required: true }) calendars: CalendarMonth[] = [];
  @Output() readonly selectDay = new EventEmitter<{ day: CalendarDay; calendar: CalendarMonth }>();

  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  onSelect(day: CalendarDay, calendar: CalendarMonth) {
    this.selectDay.emit({ day, calendar });
  }
}
