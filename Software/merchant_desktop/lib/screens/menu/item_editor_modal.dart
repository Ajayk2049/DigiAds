import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../../config.dart';
import '../../constants/app_colors.dart';
import '../../constants/app_theme.dart';
import '../../models/menu_models.dart';
import '../../providers/menu_provider.dart';
import '../../providers/venue_provider.dart';

class ItemEditorModal extends StatefulWidget {
  final int itemIndex; // -1 for new item
  final String? defaultCategory;

  const ItemEditorModal({
    super.key,
    required this.itemIndex,
    this.defaultCategory,
  });

  @override
  State<ItemEditorModal> createState() => _ItemEditorModalState();
}

class _ItemEditorModalState extends State<ItemEditorModal> {
  final _nameController = TextEditingController();
  final _priceController = TextEditingController();
  final _descController = TextEditingController();
  final _imageUrlController = TextEditingController();

  String _category = 'Starters';
  bool _isVeg = true;
  bool _isAvailable = true;
  bool _isPopular = false;
  bool _isAllShifts = false;
  bool _isUploadingImage = false;
  List<String> _selectedShifts = ['Breakfast'];
  List<CustomizationGroup> _customizations = [];

  @override
  void initState() {
    super.initState();
    final menuProv = context.read<MenuProvider>();

    if (widget.itemIndex >= 0 && widget.itemIndex < menuProv.items.length) {
      final item = menuProv.items[widget.itemIndex];
      _nameController.text = item.name;
      _priceController.text = item.priceInRupees.toStringAsFixed(2);
      _descController.text = item.description;
      _imageUrlController.text = item.imageUrl;
      _category = item.category;
      _isVeg = item.isVeg;
      _isAvailable = item.isAvailable;
      _isPopular = item.isPopular;
      _isAllShifts = item.isAllShifts;
      _selectedShifts = List.from(item.shifts);
      _customizations = item.customizations.map((g) => g.copyWith()).toList();
    } else {
      _category = widget.defaultCategory ?? (menuProv.categories.isNotEmpty ? menuProv.categories.first : 'Starters');
      _selectedShifts = [menuProv.selectedViewingShift];
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    _descController.dispose();
    _imageUrlController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadImage() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
    );

    if (result != null && result.files.single.path != null && mounted) {
      final venueId = context.read<VenueProvider>().selectedVenue?.id;
      if (venueId != null && mounted) {
        setState(() => _isUploadingImage = true);
        final url = await context.read<MenuProvider>().uploadImage(result.files.single.path!, venueId);
        if (mounted) {
          setState(() {
            _isUploadingImage = false;
            if (url != null) {
              _imageUrlController.text = url;
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Failed to upload dish photo. Please try again.'),
                  backgroundColor: AppColors.danger,
                ),
              );
            }
          });
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final menuProv = context.watch<MenuProvider>();
    final categories = menuProv.categories;
    final shifts = menuProv.shifts;

    return Dialog(
      backgroundColor: Theme.of(context).cardColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusLarge)),
      child: Container(
        width: 680,
        padding: const EdgeInsets.all(24),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Modal Title
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    widget.itemIndex == -1 ? 'ADD NEW DISH ITEM' : 'EDIT DISH ITEM',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, letterSpacing: 0.8),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, size: 18),
                    onPressed: _isUploadingImage ? null : () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 16),

              // Dish Name & Price Row
              Row(
                children: [
                  Expanded(
                    flex: 6,
                    child: TextField(
                      controller: _nameController,
                      decoration: const InputDecoration(labelText: 'Dish Name', hintText: 'e.g. Masala Dosa'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 4,
                    child: TextField(
                      controller: _priceController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Price (Rs.)', prefixText: 'Rs. '),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Description
              TextField(
                controller: _descController,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  hintText: 'e.g. Crispy golden crepe served with spiced potato masala and chutneys',
                ),
              ),
              const SizedBox(height: 14),

              // Category & Veg/Non-Veg Row
              Row(
                children: [
                  // Category Dropdown
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: categories.contains(_category) ? _category : (categories.isNotEmpty ? categories.first : null),
                      decoration: const InputDecoration(labelText: 'Food Category'),
                      items: categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _category = val);
                      },
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Veg / Non-Veg Toggle Box
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkCardElevated : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                        border: Border.all(color: Theme.of(context).dividerColor, width: 0.8),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          InkWell(
                            onTap: () => setState(() => _isVeg = true),
                            borderRadius: BorderRadius.circular(4),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              child: Row(
                                children: [
                                  Radio<bool>(
                                    value: true,
                                    // ignore: deprecated_member_use
                                    groupValue: _isVeg,
                                    // ignore: deprecated_member_use
                                    onChanged: (val) => setState(() => _isVeg = true),
                                    activeColor: AppColors.vegGreen,
                                  ),
                                  const Text('Veg', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.vegGreen)),
                                ],
                              ),
                            ),
                          ),
                          InkWell(
                            onTap: () => setState(() => _isVeg = false),
                            borderRadius: BorderRadius.circular(4),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              child: Row(
                                children: [
                                  Radio<bool>(
                                    value: false,
                                    // ignore: deprecated_member_use
                                    groupValue: _isVeg,
                                    // ignore: deprecated_member_use
                                    onChanged: (val) => setState(() => _isVeg = false),
                                    activeColor: AppColors.nonVegRed,
                                  ),
                                  const Text('Non-Veg', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.nonVegRed)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // All-Shifts & Shift Selection
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkCardElevated : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                  border: Border.all(color: Theme.of(context).dividerColor, width: 0.8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Available in All Shifts (All-Day)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      value: _isAllShifts,
                      onChanged: (val) => setState(() => _isAllShifts = val ?? false),
                    ),
                    if (!_isAllShifts) ...[
                      const Text('Select Shifts for this dish:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 8,
                        children: shifts.map((s) {
                          final isSelected = _selectedShifts.contains(s);
                          return FilterChip(
                            label: Text(s, style: TextStyle(fontSize: 11, color: isSelected ? Colors.white : null)),
                            selected: isSelected,
                            selectedColor: AppColors.primary,
                            onSelected: (selected) {
                              setState(() {
                                if (selected) {
                                  _selectedShifts.add(s);
                                } else {
                                  _selectedShifts.remove(s);
                                }
                              });
                            },
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Availability & Popular Toggles
              Row(
                children: [
                  Expanded(
                    child: CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Available for Ordering', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      value: _isAvailable,
                      onChanged: (val) => setState(() => _isAvailable = val ?? true),
                    ),
                  ),
                  Expanded(
                    child: CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Row(
                        children: [
                          Icon(LucideIcons.star, size: 14, color: AppColors.warning),
                          SizedBox(width: 4),
                          Text('Feature in Popular', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        ],
                      ),
                      value: _isPopular,
                      onChanged: (val) => setState(() => _isPopular = val ?? false),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Dish Photo & Live Thumbnail Box
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkCardElevated : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                  border: Border.all(color: Theme.of(context).dividerColor, width: 0.8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Dish Photo (PNG, JPG, WebP)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),

                    if (_imageUrlController.text.isNotEmpty) ...[
                      Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                            child: Image.network(
                              AppConfig.resolveMediaUrl(_imageUrlController.text.trim()),
                              width: 80,
                              height: 80,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                width: 80,
                                height: 80,
                                color: Colors.grey.shade300,
                                child: const Icon(LucideIcons.utensilsCrossed, color: Colors.grey),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _imageUrlController.text.trim(),
                                  style: const TextStyle(fontSize: 10, fontFamily: 'Courier'),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    OutlinedButton.icon(
                                      onPressed: _isUploadingImage ? null : _pickAndUploadImage,
                                      icon: const Icon(LucideIcons.upload, size: 12),
                                      label: const Text('Change Photo', style: TextStyle(fontSize: 10)),
                                    ),
                                    const SizedBox(width: 8),
                                    TextButton.icon(
                                      onPressed: () => setState(() => _imageUrlController.clear()),
                                      icon: const Icon(LucideIcons.trash2, size: 12, color: AppColors.danger),
                                      label: const Text('Remove', style: TextStyle(fontSize: 10, color: AppColors.danger)),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ] else ...[
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _imageUrlController,
                              onChanged: (_) => setState(() {}),
                              decoration: const InputDecoration(
                                labelText: 'Photo URL (or choose from PC)',
                                hintText: 'https://... or click Choose Photo',
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            onPressed: _isUploadingImage ? null : _pickAndUploadImage,
                            icon: _isUploadingImage
                                ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Icon(LucideIcons.upload, size: 14),
                            label: const Text('Choose Photo', style: TextStyle(fontSize: 11)),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Dish Customisations & Add-ons Section
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkCardElevated : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                  border: Border.all(color: Theme.of(context).dividerColor, width: 0.8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'DISH CUSTOMISATIONS & ADD-ONS',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.6),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Add custom choices for this dish (e.g. Portion Size, Sweetener, Extra toppings).',
                              style: TextStyle(fontSize: 10, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                            ),
                          ],
                        ),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          ),
                          onPressed: () {
                            setState(() {
                              _customizations.add(
                                CustomizationGroup(
                                  title: '',
                                  pricingType: 'addon',
                                  isMultiple: false,
                                  isRequired: false,
                                  options: [
                                    CustomizationOption(name: '', extraPrice: 0, isDefault: false),
                                  ],
                                ),
                              );
                            });
                          },
                          icon: const Icon(LucideIcons.plus, size: 12),
                          label: const Text('Add Group', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    if (_customizations.isEmpty) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Theme.of(context).cardColor,
                          borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                          border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
                        ),
                        child: Center(
                          child: Text(
                            'No customisations configured. Customers will order this dish directly without extra options.',
                            style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                          ),
                        ),
                      ),
                    ] else ...[
                      for (int gIdx = 0; gIdx < _customizations.length; gIdx++) ...[
                        _buildCustomizationGroupCard(gIdx, isDark),
                        if (gIdx < _customizations.length - 1) const SizedBox(height: 12),
                      ],
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Save Action Buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: _isUploadingImage ? null : () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton(
                    onPressed: _isUploadingImage
                        ? null
                        : () {
                            final name = _nameController.text.trim();
                            final priceVal = double.tryParse(_priceController.text.trim()) ?? 0;

                            if (name.isEmpty || priceVal <= 0) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Please enter valid dish name and price')),
                              );
                              return;
                            }

                            final priceInPaise = (priceVal * 100).round();

                            final cleanedCustomizations = _customizations
                                .where((g) => g.title.trim().isNotEmpty)
                                .map((g) {
                                  final cleanOptions = g.options
                                      .where((o) => o.name.trim().isNotEmpty)
                                      .toList();
                                  if (g.isDirect) {
                                    final hasDefault = cleanOptions.any((o) => o.isDefault);
                                    if (!hasDefault && cleanOptions.isNotEmpty) {
                                      cleanOptions.first.isDefault = true;
                                    }
                                  }
                                  return g.copyWith(
                                    title: g.title.trim(),
                                    options: cleanOptions,
                                  );
                                })
                                .where((g) => g.options.isNotEmpty)
                                .toList();

                            final newItem = MenuItemModel(
                              itemId: widget.itemIndex >= 0
                                  ? menuProv.items[widget.itemIndex].itemId
                                  : 'item_${DateTime.now().millisecondsSinceEpoch}',
                              name: name,
                              price: priceInPaise,
                              description: _descController.text.trim(),
                              category: _category,
                              isVeg: _isVeg,
                              isAvailable: _isAvailable,
                              isPopular: _isPopular,
                              isAllShifts: _isAllShifts,
                              shifts: _isAllShifts ? [] : (_selectedShifts.isNotEmpty ? _selectedShifts : [shifts.first]),
                              imageUrl: _imageUrlController.text.trim(),
                              customizations: cleanedCustomizations,
                            );

                            if (widget.itemIndex == -1) {
                              menuProv.addItem(newItem);
                            } else {
                              menuProv.updateItem(widget.itemIndex, newItem);
                            }

                            Navigator.pop(context);
                          },
                    child: _isUploadingImage
                        ? const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                width: 12,
                                height: 12,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              ),
                              SizedBox(width: 8),
                              Text('UPLOADING PHOTO...', style: TextStyle(fontSize: 11)),
                            ],
                          )
                        : const Text('SAVE DISH'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCustomizationGroupCard(int gIdx, bool isDark) {
    final group = _customizations[gIdx];
    final isDirect = group.isDirect;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
        border: Border.all(
          color: isDirect ? Colors.amber.withValues(alpha: 0.4) : Theme.of(context).dividerColor,
          width: isDirect ? 1.2 : 0.8,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Group Title & Pricing Type Controls
          Row(
            children: [
              Expanded(
                flex: 5,
                child: TextFormField(
                  initialValue: group.title,
                  onChanged: (val) => group.title = val,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    labelText: isDirect ? 'Group Title (e.g. Size, Portion)' : 'Group Title (e.g. Milk, Toppings)',
                    hintText: isDirect ? 'e.g. Pack Size' : 'e.g. Extra Toppings',
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Mode Toggle Pills: +₹ Add-on vs ₹ Direct Price
              Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkCardElevated : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: Theme.of(context).dividerColor, width: 0.8),
                ),
                padding: const EdgeInsets.all(2),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    InkWell(
                      onTap: () {
                        setState(() {
                          group.pricingType = 'addon';
                          group.isMultiple = false;
                          group.isRequired = false;
                        });
                      },
                      borderRadius: BorderRadius.circular(4),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                        decoration: BoxDecoration(
                          color: !isDirect ? AppColors.primary : Colors.transparent,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '+₹ Add-on',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: !isDirect ? Colors.white : (isDark ? AppColors.darkMuted : AppColors.lightMuted),
                          ),
                        ),
                      ),
                    ),
                    InkWell(
                      onTap: () {
                        setState(() {
                          group.pricingType = 'direct';
                          group.isMultiple = false;
                          if (group.options.isNotEmpty && !group.options.any((o) => o.isDefault)) {
                            group.options.first.isDefault = true;
                          }
                        });
                      },
                      borderRadius: BorderRadius.circular(4),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                        decoration: BoxDecoration(
                          color: isDirect ? Colors.amber.shade700 : Colors.transparent,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '₹ Direct Price',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: isDirect ? Colors.white : (isDark ? AppColors.darkMuted : AppColors.lightMuted),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 8),

              // Delete Group Button
              IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                icon: const Icon(LucideIcons.trash2, size: 14, color: AppColors.danger),
                tooltip: 'Remove Group',
                onPressed: () {
                  setState(() => _customizations.removeAt(gIdx));
                },
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Toggles row (Multi-select, Mandatory Popup)
          Row(
            children: [
              if (!isDirect) ...[
                InkWell(
                  onTap: () => setState(() => group.isMultiple = !group.isMultiple),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: 20,
                        height: 20,
                        child: Checkbox(
                          value: group.isMultiple,
                          onChanged: (val) => setState(() => group.isMultiple = val ?? false),
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Text('Multi-select', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                const SizedBox(width: 14),
              ],

              InkWell(
                onTap: () => setState(() => group.isRequired = !group.isRequired),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 20,
                      height: 20,
                      child: Checkbox(
                        activeColor: group.isRequired ? Colors.amber.shade700 : AppColors.primary,
                        value: group.isRequired,
                        onChanged: (val) => setState(() => group.isRequired = val ?? false),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      group.isRequired
                          ? 'Mandatory Popup (CUSTOMISE button)'
                          : (isDirect ? '1-Tap ADD (Default Size)' : '1-Tap ADD (Default Price)'),
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                        color: group.isRequired ? Colors.amber.shade800 : AppColors.success,
                      ),
                    ),
                  ],
                ),
              ),

              const Spacer(),

              if (isDirect)
                const Text(
                  '★ Click star to set Default Card Price',
                  style: TextStyle(fontSize: 10, fontStyle: FontStyle.italic, color: Colors.amber),
                ),
            ],
          ),

          const SizedBox(height: 8),
          const Divider(height: 1),
          const SizedBox(height: 8),

          // Option Rows
          for (int oIdx = 0; oIdx < group.options.length; oIdx++) ...[
            _buildOptionRow(group, gIdx, oIdx, isDirect, isDark),
            if (oIdx < group.options.length - 1) const SizedBox(height: 6),
          ],

          const SizedBox(height: 8),

          // Add Option Button
          TextButton.icon(
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              visualDensity: VisualDensity.compact,
            ),
            onPressed: () {
              setState(() {
                group.options.add(
                  CustomizationOption(
                    name: '',
                    extraPrice: 0,
                    isDefault: isDirect && group.options.isEmpty,
                  ),
                );
              });
            },
            icon: const Icon(LucideIcons.plus, size: 12),
            label: const Text('Add Option', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildOptionRow(CustomizationGroup group, int gIdx, int oIdx, bool isDirect, bool isDark) {
    final opt = group.options[oIdx];

    return Row(
      children: [
        if (isDirect) ...[
          IconButton(
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
            icon: Icon(
              opt.isDefault ? Icons.star : Icons.star_border,
              size: 18,
              color: opt.isDefault ? Colors.amber : (isDark ? Colors.white38 : Colors.grey.shade400),
            ),
            tooltip: opt.isDefault ? 'Default / Card Price' : 'Click to set as Default Card Price',
            onPressed: () {
              setState(() {
                for (int i = 0; i < group.options.length; i++) {
                  group.options[i].isDefault = (i == oIdx);
                }
                if (opt.extraPrice > 0) {
                  _priceController.text = opt.extraPriceInRupees.toStringAsFixed(2);
                }
              });
            },
          ),
          const SizedBox(width: 4),
        ],

        // Option Name
        Expanded(
          flex: 6,
          child: TextFormField(
            initialValue: opt.name,
            onChanged: (val) => opt.name = val,
            style: const TextStyle(fontSize: 11),
            decoration: InputDecoration(
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
              hintText: isDirect ? 'Variant Name (e.g. 500 Gm, Full)' : 'Option Name (e.g. Oat Milk, Sugar Free)',
            ),
          ),
        ),

        const SizedBox(width: 8),

        // Extra / Direct Price
        Expanded(
          flex: 4,
          child: TextFormField(
            initialValue: opt.extraPrice == 0 ? '0' : (opt.extraPrice / 100.0).toStringAsFixed(opt.extraPrice % 100 == 0 ? 0 : 2),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            onChanged: (val) {
              final parsed = double.tryParse(val.trim()) ?? 0;
              opt.extraPrice = (parsed * 100).round();
              if (isDirect && opt.isDefault) {
                _priceController.text = parsed.toStringAsFixed(2);
              }
            },
            style: const TextStyle(fontSize: 11, fontFamily: 'monospace'),
            decoration: InputDecoration(
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
              prefixText: isDirect ? 'Rs. ' : '+Rs. ',
              prefixStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
              hintText: '0',
            ),
          ),
        ),

        const SizedBox(width: 6),

        // Remove Option
        IconButton(
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
          icon: Icon(LucideIcons.x, size: 14, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
          tooltip: 'Remove Option',
          onPressed: () {
            setState(() {
              final wasDefault = opt.isDefault;
              group.options.removeAt(oIdx);
              if (isDirect && wasDefault && group.options.isNotEmpty) {
                group.options.first.isDefault = true;
              }
            });
          },
        ),
      ],
    );
  }
}
