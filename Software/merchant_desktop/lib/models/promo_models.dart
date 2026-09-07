class PromoSlotModel {
  final String slotType; // 'video' | 'image' | 'screen_video' | 'screen_image'
  final int index;
  String? previewUrl;
  String? filePath;
  String? title;
  bool isModified;
  bool isDeleted;

  PromoSlotModel({
    required this.slotType,
    required this.index,
    this.previewUrl,
    this.filePath,
    this.title,
    this.isModified = false,
    this.isDeleted = false,
  });
}

class PromoQuotaStats {
  final int maxVideoSlots;
  final int maxImageSlots;
  final int maxScreenVideoSlots;
  final int maxScreenImageSlots;
  final int dailyVideoQuota;
  final int dailyImageQuota;
  final int dailyScreenVideoQuota;
  final int dailyScreenImageQuota;
  final int dailyVideoChangesRemaining;
  final int dailyImageChangesRemaining;
  final int dailyScreenVideoChangesRemaining;
  final int dailyScreenImageChangesRemaining;
  final bool isPaused;
  final bool isRevoked;

  PromoQuotaStats({
    this.maxVideoSlots = 2,
    this.maxImageSlots = 5,
    this.maxScreenVideoSlots = 2,
    this.maxScreenImageSlots = 5,
    this.dailyVideoQuota = 4,
    this.dailyImageQuota = 10,
    this.dailyScreenVideoQuota = 4,
    this.dailyScreenImageQuota = 10,
    this.dailyVideoChangesRemaining = 4,
    this.dailyImageChangesRemaining = 10,
    this.dailyScreenVideoChangesRemaining = 4,
    this.dailyScreenImageChangesRemaining = 10,
    this.isPaused = false,
    this.isRevoked = false,
  });

  factory PromoQuotaStats.fromJson(Map<String, dynamic> json) {
    return PromoQuotaStats(
      maxVideoSlots: (json['maxVideoSlots'] as num?)?.toInt() ?? 2,
      maxImageSlots: (json['maxImageSlots'] as num?)?.toInt() ?? 5,
      maxScreenVideoSlots: (json['maxScreenVideoSlots'] as num?)?.toInt() ?? 2,
      maxScreenImageSlots: (json['maxScreenImageSlots'] as num?)?.toInt() ?? 5,
      dailyVideoQuota: (json['dailyVideoQuota'] as num?)?.toInt() ?? 4,
      dailyImageQuota: (json['dailyImageQuota'] as num?)?.toInt() ?? 10,
      dailyScreenVideoQuota: (json['dailyScreenVideoQuota'] as num?)?.toInt() ?? 4,
      dailyScreenImageQuota: (json['dailyScreenImageQuota'] as num?)?.toInt() ?? 10,
      dailyVideoChangesRemaining: (json['dailyVideoChangesRemaining'] as num?)?.toInt() ?? 4,
      dailyImageChangesRemaining: (json['dailyImageChangesRemaining'] as num?)?.toInt() ?? 10,
      dailyScreenVideoChangesRemaining: (json['dailyScreenVideoChangesRemaining'] as num?)?.toInt() ?? 4,
      dailyScreenImageChangesRemaining: (json['dailyScreenImageChangesRemaining'] as num?)?.toInt() ?? 10,
      isPaused: json['isPaused'] ?? false,
      isRevoked: json['isRevoked'] ?? false,
    );
  }
}
