import 'package:flutter/material.dart';

/// O'zbekcha status nomlari (shared paket bilan mos)
const statusLabels = <String, String>{
  'NEW': 'Yangi murojaat',
  'AI_ANALYZING': 'AI tahlil qilmoqda',
  'OPERATOR_REVIEW': 'Operator ko‘rigida',
  'ASSIGNED': 'Biriktirildi',
  'ACCEPTED': 'Qabul qilindi',
  'IN_PROGRESS': 'Jarayonda',
  'WAITING_CITIZEN_INFO': 'Fuqarodan ma’lumot kutilmoqda',
  'WAITING_EVIDENCE': 'Dalil kutilmoqda',
  'COMPLETED': 'Bajarildi',
  'REJECTED': 'Rad etildi',
  'REOPENED': 'Qayta ochildi',
  'OVERDUE': 'Kechikmoqda',
  'CLOSED': 'Yopildi',
};

const priorityLabels = <String, String>{
  'LOW': 'Past',
  'MEDIUM': 'O‘rta',
  'HIGH': 'Yuqori',
  'URGENT': 'Shoshilinch',
};

const statusColors = <String, Color>{
  'NEW': Color(0xFF3B82F6),
  'AI_ANALYZING': Color(0xFF8B5CF6),
  'OPERATOR_REVIEW': Color(0xFF06B6D4),
  'ASSIGNED': Color(0xFF6366F1),
  'ACCEPTED': Color(0xFF0EA5E9),
  'IN_PROGRESS': Color(0xFFEAB308),
  'WAITING_CITIZEN_INFO': Color(0xFFF97316),
  'WAITING_EVIDENCE': Color(0xFFF97316),
  'COMPLETED': Color(0xFF22C55E),
  'REJECTED': Color(0xFF6B7280),
  'REOPENED': Color(0xFFEC4899),
  'OVERDUE': Color(0xFFEF4444),
  'CLOSED': Color(0xFF64748B),
};

const priorityColors = <String, Color>{
  'LOW': Color(0xFF6B7280),
  'MEDIUM': Color(0xFF3B82F6),
  'HIGH': Color(0xFFF97316),
  'URGENT': Color(0xFFEF4444),
};

String fmtDate(String? iso) {
  if (iso == null) return '—';
  final d = DateTime.tryParse(iso)?.toLocal();
  if (d == null) return '—';
  String p(int n) => n.toString().padLeft(2, '0');
  return '${p(d.day)}.${p(d.month)}.${d.year} ${p(d.hour)}:${p(d.minute)}';
}

class StatusChip extends StatelessWidget {
  final String status;
  const StatusChip(this.status, {super.key});

  @override
  Widget build(BuildContext context) {
    final color = statusColors[status] ?? Colors.grey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        statusLabels[status] ?? status,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color),
      ),
    );
  }
}

class PriorityChip extends StatelessWidget {
  final String priority;
  const PriorityChip(this.priority, {super.key});

  @override
  Widget build(BuildContext context) {
    final color = priorityColors[priority] ?? Colors.grey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        priorityLabels[priority] ?? priority,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color),
      ),
    );
  }
}
