import pytest
import json
import os
from pathlib import Path
from generator import load_data, validate_data, render_template

def test_load_data_valid(tmp_path):
    data = {"test": "data"}
    data_file = tmp_path / "test.json"
    with open(data_file, "w") as f:
        json.dump(data, f)
    
    loaded = load_data(data_file)
    assert loaded == data

def test_load_data_invalid_json(tmp_path):
    data_file = tmp_path / "invalid.json"
    with open(data_file, "w") as f:
        f.write("{invalid: json}")
    
    with pytest.raises(json.JSONDecodeError):
        load_data(data_file)

def test_validate_data_valid(tmp_path):
    schema = {
        "type": "object",
        "properties": {"name": {"type": "string"}},
        "required": ["name"]
    }
    schema_file = tmp_path / "schema.json"
    with open(schema_file, "w") as f:
        json.dump(schema, f)
    
    data = {"name": "Test"}
    # Should not exit
    validate_data(data, schema_file)

def test_validate_data_invalid(tmp_path):
    schema = {
        "type": "object",
        "properties": {"name": {"type": "string"}},
        "required": ["name"]
    }
    schema_file = tmp_path / "schema.json"
    with open(schema_file, "w") as f:
        json.dump(schema, f)
    
    data = {"age": 25}
    import jsonschema
    with pytest.raises(jsonschema.ValidationError):
        validate_data(data, schema_file)

def test_render_template(tmp_path):
    template_dir = tmp_path / "templates"
    template_dir.mkdir()
    template_file = template_dir / "test.tex.j2"
    with open(template_file, "w") as f:
        f.write(r"Hello \VAR{name}!")
    
    output_path = tmp_path / "output.tex"
    data = {"name": "World"}
    
    render_template(data, template_dir, "test.tex.j2", output_path)
    
    assert output_path.exists()
    with open(output_path, "r") as f:
        assert f.read() == "Hello World!"
