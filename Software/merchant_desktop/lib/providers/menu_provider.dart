import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../models/menu_models.dart';
import '../services/api_service.dart';

class MenuProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  MenuModel? _menu;
  List<MenuItemModel> _draftItems = [];
  List<String> _categories = ['Starters', 'Main Course', 'Dessert', 'Beverages'];
  Map<String, String> _categoryIcons = {};
  List<String> _shifts = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
  String _activeShift = 'Breakfast';
  String _selectedViewingShift = 'Breakfast';

  bool _isLoading = false;
  bool _isSwitchingShift = false;
  bool _isSaving = false;
  bool _hasChanges = false;
  String? _error;

  String _popularCategoryName = 'Popular';
  String _popularCategoryIcon = 'star';

  MenuModel? get menu => _menu;
  List<MenuItemModel> get items => _draftItems;
  List<String> get categories => _categories;
  Map<String, String> get categoryIcons => _categoryIcons;
  String getCategoryIcon(String catName) => _categoryIcons[catName.toLowerCase()] ?? '';
  String get popularCategoryName => _popularCategoryName;
  String get popularCategoryIcon => _popularCategoryIcon;

  void setPopularCategory({String? name, String? icon}) {
    if (name != null) _popularCategoryName = name.trim();
    if (icon != null) _popularCategoryIcon = icon.trim();
    _hasChanges = true;
    notifyListeners();
  }

  List<String> get shifts => _shifts;
  String get activeShift => _activeShift;
  String get selectedViewingShift => _selectedViewingShift;
  bool get isLoading => _isLoading;
  bool get isSwitchingShift => _isSwitchingShift;
  bool get isSaving => _isSaving;
  bool get hasChanges => _hasChanges;
  String? get error => _error;

  void markDirty() {
    _hasChanges = true;
    notifyListeners();
  }

  void resetDirty() {
    _hasChanges = false;
    notifyListeners();
  }

  void setSelectedViewingShift(String shift) {
    _selectedViewingShift = shift;
    notifyListeners();
  }

  Future<void> fetchMenu(String hostApplicationId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await _api.get('/host/menu', queryParameters: {'hostApplicationId': hostApplicationId});
      if (res.data['success'] == true && res.data['data'] != null) {
        _menu = MenuModel.fromJson(res.data['data']);
        _draftItems = List.from(_menu!.items);
        _categories = List.from(_menu!.categories);
        _categoryIcons = Map.from(_menu!.categoryIcons);
        _popularCategoryName = _menu!.popularCategoryName;
        _popularCategoryIcon = _menu!.popularCategoryIcon;
        _shifts = List.from(_menu!.shifts);
        _activeShift = _menu!.activeShift;
        _selectedViewingShift = _activeShift;
        _hasChanges = false;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> switchLiveShift(String hostApplicationId, String targetShift) async {
    _isSwitchingShift = true;
    notifyListeners();

    try {
      final res = await _api.post('/host/menu/switch-shift', data: {
        'hostApplicationId': hostApplicationId,
        'activeShift': targetShift,
        'shift': targetShift,
      });

      if (res.data['success'] == true) {
        _activeShift = targetShift;
        _selectedViewingShift = targetShift;
        _isSwitchingShift = false;
        notifyListeners();
        return true;
      }
      _isSwitchingShift = false;
      notifyListeners();
      return false;
    } catch (e) {
      _isSwitchingShift = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> saveMenu(String hostApplicationId) async {
    _isSaving = true;
    notifyListeners();

    try {
      final payload = {
        'hostApplicationId': hostApplicationId,
        'items': _draftItems.map((e) => e.toJson()).toList(),
        'categories': _categories.map((c) => {
          'name': c,
          'icon': _categoryIcons[c.toLowerCase()] ?? '',
        }).toList(),
        'popularCategory': {
          'name': _popularCategoryName,
          'icon': _popularCategoryIcon,
        },
        'shifts': _shifts,
        'activeShift': _activeShift,
      };

      final res = await _api.post('/host/menu', data: payload);
      if (res.data['success'] == true) {
        _menu = MenuModel.fromJson(res.data['data']);
        _draftItems = List.from(_menu!.items);
        _categories = List.from(_menu!.categories);
        _categoryIcons = Map.from(_menu!.categoryIcons);
        _popularCategoryName = _menu!.popularCategoryName;
        _popularCategoryIcon = _menu!.popularCategoryIcon;
        _hasChanges = false;
        _isSaving = false;
        notifyListeners();
        return true;
      }
      _isSaving = false;
      notifyListeners();
      return false;
    } catch (e) {
      _isSaving = false;
      notifyListeners();
      return false;
    }
  }

  Future<String?> uploadImage(String filePath, String hostApplicationId) async {
    try {
      final file = File(filePath);
      final filename = file.path.split(Platform.pathSeparator).last;
      final bytes = await file.readAsBytes();
      final ext = filename.toLowerCase().endsWith('.png') ? '.png' : '.jpg';

      final res = await _api.post(
        '/host/menu/upload-image',
        data: bytes,
        options: Options(
          headers: {
            'Content-Type': ext == '.png' ? 'image/png' : 'image/jpeg',
            'X-Filename': filename,
            'X-Host-Application-Id': hostApplicationId,
          },
        ),
      );

      if (res.data['success'] == true && res.data['data'] != null) {
        return res.data['data']['url'];
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  void addItem(MenuItemModel item) {
    _draftItems.add(item);
    _hasChanges = true;
    notifyListeners();
  }

  void updateItem(int index, MenuItemModel updated) {
    if (index >= 0 && index < _draftItems.length) {
      _draftItems[index] = updated;
      _hasChanges = true;
      notifyListeners();
    }
  }

  void removeItem(int index) {
    if (index >= 0 && index < _draftItems.length) {
      _draftItems.removeAt(index);
      _hasChanges = true;
      notifyListeners();
    }
  }

  void addCategory(String categoryName, [String iconKey = '']) {
    final trimmed = categoryName.trim();
    if (trimmed.isEmpty) return;
    if (!_categories.any((c) => c.toLowerCase() == trimmed.toLowerCase())) {
      _categories.add(trimmed);
      if (iconKey.isNotEmpty) {
        _categoryIcons[trimmed.toLowerCase()] = iconKey;
      }
      _hasChanges = true;
      notifyListeners();
    }
  }

  void renameCategory(String oldName, String newName) {
    final trimmedNew = newName.trim();
    final trimmedOld = oldName.trim();
    if (trimmedNew.isEmpty) return;

    final idx = _categories.indexWhere((c) => c.toLowerCase() == trimmedOld.toLowerCase());
    if (idx == -1) return;

    // Check duplicate
    final isDuplicate = _categories.any((c) => c.toLowerCase() == trimmedNew.toLowerCase() && c.toLowerCase() != trimmedOld.toLowerCase());
    if (isDuplicate) return;

    _categories[idx] = trimmedNew;

    // Migrate icon
    if (_categoryIcons.containsKey(trimmedOld.toLowerCase())) {
      final icon = _categoryIcons.remove(trimmedOld.toLowerCase());
      if (icon != null && icon.isNotEmpty) {
        _categoryIcons[trimmedNew.toLowerCase()] = icon;
      }
    }

    // Atomically cascade new category name to all items in draft
    for (final item in _draftItems) {
      if (item.category.trim().toLowerCase() == trimmedOld.toLowerCase()) {
        item.category = trimmedNew;
      }
    }

    _hasChanges = true;
    notifyListeners();
  }

  void moveCategory(int index, int direction) {
    final targetIndex = index + direction;
    if (index < 0 || index >= _categories.length) return;
    if (targetIndex < 0 || targetIndex >= _categories.length) return;

    final item = _categories.removeAt(index);
    _categories.insert(targetIndex, item);
    _hasChanges = true;
    notifyListeners();
  }

  void reorderCategories(int oldIndex, int newIndex) {
    if (oldIndex < 0 || oldIndex >= _categories.length) return;
    if (oldIndex < newIndex) {
      newIndex -= 1;
    }
    if (newIndex < 0 || newIndex >= _categories.length) return;
    final item = _categories.removeAt(oldIndex);
    _categories.insert(newIndex, item);
    _hasChanges = true;
    notifyListeners();
  }

  void setCategoryIcon(String categoryName, String iconKey) {
    _categoryIcons[categoryName.toLowerCase()] = iconKey;
    _hasChanges = true;
    notifyListeners();
  }

  void removeCategory(String categoryName) {
    if (_categories.length <= 1) return;
    _categories.removeWhere((c) => c.toLowerCase() == categoryName.trim().toLowerCase());
    _categoryIcons.remove(categoryName.trim().toLowerCase());
    _hasChanges = true;
    notifyListeners();
  }

  void addShift(String shiftName) {
    if (!_shifts.contains(shiftName)) {
      _shifts.add(shiftName);
      _hasChanges = true;
      notifyListeners();
    }
  }

  void renameShift(String oldName, String newName) {
    final idx = _shifts.indexOf(oldName);
    if (idx != -1) {
      _shifts[idx] = newName;
      if (_activeShift == oldName) _activeShift = newName;
      if (_selectedViewingShift == oldName) _selectedViewingShift = newName;

      // Update shifts in items
      for (final item in _draftItems) {
        final itemShiftIdx = item.shifts.indexOf(oldName);
        if (itemShiftIdx != -1) {
          item.shifts[itemShiftIdx] = newName;
        }
      }
      _hasChanges = true;
      notifyListeners();
    }
  }

  void deleteShift(String shiftName) {
    if (_shifts.length <= 1) return;
    _shifts.remove(shiftName);
    if (_activeShift == shiftName) {
      _activeShift = _shifts.first;
    }
    if (_selectedViewingShift == shiftName) {
      _selectedViewingShift = _shifts.first;
    }
    _hasChanges = true;
    notifyListeners();
  }
}
