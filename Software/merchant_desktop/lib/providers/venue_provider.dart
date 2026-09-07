import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../models/host_application_model.dart';
import '../models/bill_config_model.dart';
import '../services/api_service.dart';

class VenueProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  List<HostApplicationModel> _applications = [];
  HostApplicationModel? _selectedVenue;
  BillConfigModel _billConfig = BillConfigModel();
  bool _isLoading = false;
  String? _error;

  List<HostApplicationModel> get applications => _applications;
  List<HostApplicationModel> get approvedVenues => _applications.where((a) => a.status == 'approved').toList();
  HostApplicationModel? get selectedVenue => _selectedVenue;
  BillConfigModel get billConfig => _billConfig;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchApplications() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await _api.get('/host/applications');
      if (res.data['success'] == true && res.data['data'] != null) {
        final list = (res.data['data'] as List<dynamic>)
            .map((e) => HostApplicationModel.fromJson(e as Map<String, dynamic>))
            .toList();
        _applications = list;

        if (_selectedVenue == null && approvedVenues.isNotEmpty) {
          _selectedVenue = approvedVenues.first;
          await fetchBillConfig(_selectedVenue!.id);
        } else if (_selectedVenue != null) {
          final matched = _applications.firstWhere(
            (a) => a.id == _selectedVenue!.id,
            orElse: () => approvedVenues.isNotEmpty ? approvedVenues.first : _applications.first,
          );
          _selectedVenue = matched;
        }
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void selectVenue(HostApplicationModel venue) {
    _selectedVenue = venue;
    notifyListeners();
    fetchBillConfig(venue.id);
  }

  Future<bool> submitApplication(Map<String, dynamic> formData) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await _api.post('/host/apply', data: formData);
      if (res.data['success'] == true) {
        await fetchApplications();
        _isLoading = false;
        notifyListeners();
        return true;
      }
      _error = res.data['message'] ?? 'Application failed';
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateApplication(String appId, Map<String, dynamic> updateData) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await _api.put('/host/applications/$appId', data: updateData);
      if (res.data['success'] == true) {
        await fetchApplications();
        _isLoading = false;
        notifyListeners();
        return true;
      }
      _error = res.data['message'] ?? 'Update failed';
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> fetchBillConfig(String appId) async {
    try {
      final res = await _api.get('/host/bill-config/$appId');
      if (res.data['success'] == true && res.data['data'] != null) {
        _billConfig = BillConfigModel.fromJson(res.data['data']);
        notifyListeners();
      }
    } catch (e) {
      // Fallback
    }
  }

  Future<bool> saveBillConfig(String appId, BillConfigModel config) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _api.put('/host/bill-config/$appId', data: config.toJson());
      if (res.data['success'] == true && res.data['data'] != null) {
        _billConfig = BillConfigModel.fromJson(res.data['data']);
        _isLoading = false;
        notifyListeners();
        return true;
      }
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<String?> uploadBillImage(String appId, List<int> bytes, String filename, String mimeType) async {
    try {
      final res = await _api.post(
        '/host/bill-config/upload-image',
        data: bytes,
        options: Options(
          headers: {
            'Content-Type': mimeType,
            'X-Filename': filename,
            'X-Host-Application-Id': appId,
          },
        ),
      );
      if (res.data != null && res.data['url'] != null) {
        return res.data['url'] as String;
      }
    } catch (e) {
      // error
    }
    return null;
  }

  Future<bool> deleteBillImage(String appId, String imageType) async {
    try {
      final res = await _api.post('/host/bill-config/delete-image', data: {
        'imageType': imageType,
        'hostApplicationId': appId,
      });
      if (res.data['success'] == true && res.data['data'] != null) {
        _billConfig = BillConfigModel.fromJson(res.data['data']);
        notifyListeners();
        return true;
      }
    } catch (_) {}
    return false;
  }
}
