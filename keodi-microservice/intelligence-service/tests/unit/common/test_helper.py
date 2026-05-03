"""
Unit tests for app.common.helper module
"""
import pytest
from app.common.helper import clip


class TestClipFunction:
    """Test cases for clip() helper function"""
    
    def test_clip_value_within_bounds(self):
        """Test that values within bounds are returned unchanged"""
        assert clip(0.5, 0.0, 1.0) == 0.5
        assert clip(5, 0, 10) == 5
        assert clip(-2, -5, 0) == -2
    
    def test_clip_value_below_min(self):
        """Test that values below min are clamped to min"""
        assert clip(-0.5, 0.0, 1.0) == 0.0
        assert clip(-10, 0, 100) == 0
        assert clip(-100, -50, 0) == -50
    
    def test_clip_value_above_max(self):
        """Test that values above max are clamped to max"""
        assert clip(1.5, 0.0, 1.0) == 1.0
        assert clip(150, 0, 100) == 100
        assert clip(0, -50, -10) == -10
    
    def test_clip_equal_min_max(self):
        """Test clipping when min equals max"""
        assert clip(0.5, 1.0, 1.0) == 1.0
        assert clip(0.5, 0.0, 0.0) == 0.0
    
    def test_clip_negative_values(self):
        """Test clipping with negative values"""
        assert clip(-0.8, -1.0, 1.0) == -0.8
        assert clip(-1.5, -1.0, 1.0) == -1.0
    
    def test_clip_float_precision(self):
        """Test clipping with floating point numbers"""
        assert clip(0.123456, 0.1, 0.2) == 0.123456
        assert clip(0.05, 0.1, 0.2) == 0.1
        assert clip(0.25, 0.1, 0.2) == 0.2
    
    def test_clip_zero_bounds(self):
        """Test clipping at zero boundaries"""
        assert clip(0, -1, 1) == 0
        assert clip(-1, -1, 1) == -1
        assert clip(1, -1, 1) == 1
    
    def test_clip_large_values(self):
        """Test clipping with large values"""
        assert clip(1000000, 0, 100000) == 100000
        assert clip(-1000000, -100000, 0) == -100000
