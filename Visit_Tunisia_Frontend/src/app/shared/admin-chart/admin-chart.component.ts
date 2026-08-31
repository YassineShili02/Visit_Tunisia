import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

// Register all Chart.js components and plugins
Chart.register(...registerables);

export type AdminChartType = 'bar' | 'doughnut' | 'line';

@Component({
  selector: 'app-admin-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full" [style.height]="height + 'px'">
      <canvas
        #chartCanvas
        [attr.aria-label]="ariaLabel"
        role="img"
        style="width:100% !important; height:100% !important;"
      ></canvas>
      <div
        *ngIf="isEmpty"
        class="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs rounded-lg"
      >
        <svg class="w-8 h-8 text-gray-300 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <span class="text-xs font-medium text-gray-400">Aucune donnée disponible</span>
      </div>
    </div>
  `,
})
export class AdminChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  /** Raw data map: label → value */
  @Input() data: Record<string, number> = {};
  /** 'bar' = horizontal bar chart | 'doughnut' = doughnut chart | 'line' = line area chart */
  @Input() type: AdminChartType = 'bar';
  /** Base color theme: 'green' | 'blue' | 'orange' */
  @Input() colorTheme: 'green' | 'blue' | 'orange' = 'green';
  /** Canvas container height in px */
  @Input() height = 280;
  /** Accessible label for screen readers */
  @Input() ariaLabel = 'Graphique statistique';

  /** Emits clicked item label */
  @Output() chartClick = new EventEmitter<string>();

  private chart: Chart | null = null;
  isEmpty = false;

  private readonly PALETTE_TYPE = [
    '#1B6FA8', // Bleu Visit Tunisia
    '#0EA5E9', // Ciel
    '#10B981', // Émeraude
    '#F59E0B', // Ambre
    '#8B5CF6', // Violet
    '#EC4899', // Rose
    '#64748B', // Ardoise
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    // Delay slightly to ensure DOM layout container has measured dimensions
    setTimeout(() => this.buildChart(), 10);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.canvasRef) {
      this.destroyChart();
      setTimeout(() => this.buildChart(), 0);
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private destroyChart(): void {
    if (this.chart) {
      try {
        this.chart.destroy();
      } catch (e) {
        console.warn('Error destroying chart:', e);
      }
      this.chart = null;
    }
  }

  private buildChart(): void {
    if (!this.canvasRef?.nativeElement) return;

    const entries = Object.entries(this.data || {});

    if (this.type === 'line') {
      this.isEmpty = entries.length === 0;
      this.cdr.markForCheck();
      if (this.isEmpty) return;

      const labels = entries.map(([k]) => k);
      const values = entries.map(([, v]) => v);
      const ctx = this.canvasRef.nativeElement.getContext('2d');
      if (!ctx) return;

      this.buildLineChart(ctx, labels, values);
      return;
    }

    // Filter zero values for bar / doughnut
    const filtered = entries.filter(([, v]) => typeof v === 'number' && v > 0);
    this.isEmpty = filtered.length === 0;
    this.cdr.markForCheck();
    if (this.isEmpty) return;

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.type === 'bar') {
      // Sort bars descending by count
      filtered.sort((a, b) => b[1] - a[1]);
      const labels = filtered.map(([k]) => k);
      const values = filtered.map(([, v]) => v);
      this.buildBarChart(ctx, labels, values);
    } else {
      const labels = filtered.map(([k]) => k);
      const values = filtered.map(([, v]) => v);
      this.buildDoughnutChart(ctx, labels, values);
    }
  }

  private buildBarChart(
    ctx: CanvasRenderingContext2D,
    labels: string[],
    values: number[]
  ): void {
    const maxVal = Math.max(...values, 1);

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Destinations',
            data: values,
            backgroundColor: '#10B981',
            hoverBackgroundColor: '#059669',
            borderColor: '#059669',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.85,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        onClick: (_event, elements, chart) => {
          if (elements && elements.length > 0) {
            const idx = elements[0].index;
            const label = chart.data.labels?.[idx] as string;
            if (label) this.chartClick.emit(label);
          }
        },
        onHover: (event, elements) => {
          const target = event.native?.target as HTMLElement;
          if (target) {
            target.style.cursor = elements && elements.length > 0 ? 'pointer' : 'default';
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'y',
          intersect: true,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#F8FAFC',
            bodyColor: '#F8FAFC',
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: (items) => items[0]?.label || '',
              label: (item) => {
                const val = item.parsed.x ?? 0;
                return ` ${val} destination${val > 1 ? 's' : ''}  ➔  Cliquer pour filtrer`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            suggestedMax: maxVal + 1,
            ticks: {
              stepSize: 1,
              color: '#64748B',
              font: { size: 11, family: 'Inter, system-ui, sans-serif' },
            },
            grid: {
              color: '#F1F5F9',
            },
          },
          y: {
            ticks: {
              color: '#334155',
              font: { size: 12, weight: 500, family: 'Inter, system-ui, sans-serif' },
            },
            grid: { display: false },
          },
        },
      },
    });
  }

  private buildDoughnutChart(
    ctx: CanvasRenderingContext2D,
    labels: string[],
    values: number[]
  ): void {
    const total = values.reduce((a, b) => a + b, 0);
    const colors = this.PALETTE_TYPE.slice(0, labels.length);

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            hoverBackgroundColor: colors.map(c => c),
            borderColor: '#FFFFFF',
            borderWidth: 2.5,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        onClick: (_event, elements, chart) => {
          if (elements && elements.length > 0) {
            const idx = elements[0].index;
            const label = chart.data.labels?.[idx] as string;
            if (label) this.chartClick.emit(label);
          }
        },
        onHover: (event, elements) => {
          const target = event.native?.target as HTMLElement;
          if (target) {
            target.style.cursor = elements && elements.length > 0 ? 'pointer' : 'default';
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 12,
              font: { size: 11, family: 'Inter, system-ui, sans-serif' },
              color: '#334155',
              usePointStyle: true,
              pointStyle: 'circle',
              generateLabels: (chart) => {
                const ds = chart.data.datasets[0];
                return (chart.data.labels as string[]).map((label, i) => {
                  const val = (ds.data as number[])[i] ?? 0;
                  const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                  return {
                    text: `${label} (${val} • ${pct}%)`,
                    fillStyle: (ds.backgroundColor as string[])[i],
                    strokeStyle: '#FFFFFF',
                    lineWidth: 1,
                    index: i,
                    hidden: false,
                    datasetIndex: 0,
                    fontColor: '#334155',
                  };
                });
              },
            },
          },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#F8FAFC',
            bodyColor: '#F8FAFC',
            padding: 10,
            cornerRadius: 8,
            displayColors: true,
            boxPadding: 4,
            callbacks: {
              label: (item) => {
                const val = item.parsed ?? 0;
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return ` ${item.label} : ${val} (${pct}%) ➔ Cliquer pour voir`;
              },
            },
          },
        },
      },
    });
  }

  private buildLineChart(
    ctx: CanvasRenderingContext2D,
    labels: string[],
    values: number[]
  ): void {
    const formattedLabels = labels.map(l => {
      if (l && l.length === 10 && l.includes('-')) {
        const parts = l.split('-');
        return `${parts[2]}/${parts[1]}`;
      }
      return l;
    });

    const maxVal = Math.max(...values, 1);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: formattedLabels,
        datasets: [
          {
            label: 'Consultations',
            data: values,
            borderColor: '#D97D45',
            backgroundColor: (context) => {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              if (!chartArea) return 'rgba(217, 125, 69, 0.12)';
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(217, 125, 69, 0.28)');
              gradient.addColorStop(1, 'rgba(217, 125, 69, 0.01)');
              return gradient;
            },
            borderWidth: 2.5,
            pointBackgroundColor: '#D97D45',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointRadius: values.length <= 7 ? 6 : 4,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#B85D26',
            pointHoverBorderColor: '#FFFFFF',
            pointHoverBorderWidth: 3,
            tension: 0.38,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#F8FAFC',
            bodyColor: '#F8FAFC',
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: (items) => {
                if (items.length > 0) {
                  const originalIndex = items[0].dataIndex;
                  return labels[originalIndex] || items[0].label;
                }
                return '';
              },
              label: (item) => {
                const val = item.parsed.y ?? 0;
                return ` 📈 ${val} consultation${val > 1 ? 's' : ''}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: '#64748B',
              font: { size: 11, family: 'Inter, system-ui, sans-serif' },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 14,
            },
            grid: {
              color: '#F1F5F9',
            },
          },
          y: {
            beginAtZero: true,
            suggestedMax: maxVal + 1,
            ticks: {
              stepSize: 1,
              color: '#64748B',
              font: { size: 11, family: 'Inter, system-ui, sans-serif' },
            },
            grid: {
              color: '#F1F5F9',
            },
          },
        },
      },
    });
  }
}
