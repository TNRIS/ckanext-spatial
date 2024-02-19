==============================================
ckanext-spatial - Geo related plugins for CKAN
==============================================

.. image:: https://github.com/ckan/ckanext-spatial/workflows/Tests/badge.svg?branch=master
    :target: https://github.com/ckan/ckanext-spatial/actions


This extension contains plugins that add geospatial capabilities to CKAN_,
including:

* Geospatial dataset search powered by Solr, providing a bounding box via
  a UI map widget or the API.
* Harvesters to import geospatial metadata into CKAN from other sources
  in ISO 19139 format and others.
* Commands to support the CSW standard using pycsw_.

**Note**: The view plugins for rendering spatial formats like GeoJSON_ have
been moved to ckanext-geoview_.

Old documentation, including installation instructions, can be found at:

https://docs.ckan.org/projects/ckanext-spatial/en/latest/

For TWDH installation (CKAN 2.9.5 on Ubuntu 20.04 LTS), first ensure you have ckanext-harvest_ installed using a Redis backend.

Afterwards, do the following::

  . /usr/lib/ckan/default/bin/activate
  sudo apt-get install postgis
  sudo -u postgres psql -d ckan_default -f /usr/share/postgresql/12/contrib/postgis-3.0/postgis.sql
  sudo -u postgres psql -d ckan_default -f /usr/share/postgresql/12/contrib/postgis-3.0/spatial_ref_sys.sql 
  sudo -u postgres psql -d ckan_default -c 'ALTER VIEW geometry_columns OWNER TO ckan_default;'
  sudo -u postgres psql -d ckan_default -c 'ALTER TABLE spatial_ref_sys OWNER TO ckan_default;'
  cd /usr/lib/ckan/default/src
  git clone https://github.com/dathere/ckanext-spatial
  cd ckanext-spatial
  pip install -r requirements.txt
  sudo apt-get install python3-dev libxml2-dev libxslt1-dev libgeos-c1v5
  python setup.py develop

then add ckanext-spatial to your ckan.ini plugins::

  ckan.plugins = ... twdh_theme harvest ckan_harvester spatial_metadata spatial_query twdh_schema ...

and restart CKAN::

  sudo service supervisor reload
Supported Versions
------------------

ckanext-spatial >= 2.0.0 supports CKAN 2.9 and CKAN 2.10.
Check the
[tested enviroments](https://github.com/ckan/ckanext-spatial/blob/master/.github/workflows/test.yml)
for more details.  

For previous CKAN versions please use the v1.x tags.


Community
---------

* `Developer mailing list <https://groups.google.com/a/ckan.org/forum/#!forum/ckan-dev>`_
* `Gitter channel <https://gitter.im/ckan/chat>`_
* `Issue tracker <https://github.com/ckan/ckanext-spatial/issues>`_


Contributing
------------

For contributing to ckanext-spatial or its documentation, follow the same
guidelines that apply to CKAN core, described in
`CONTRIBUTING <https://github.com/ckan/ckan/blob/master/CONTRIBUTING.rst>`_.


Copying and License
-------------------

This material is copyright (c) 2011-2023 Open Knowledge Foundation and contributors.

It is open and licensed under the GNU Affero General Public License (AGPL) v3.0
whose full text may be found at:

http://www.fsf.org/licensing/licenses/agpl-3.0.html

.. _CKAN: http://ckan.org
.. _pycsw: http://pycsw.org
.. _GeoJSON: http://geojson.org
.. _ckanext-geoview: https://github.com/ckan/ckanext-geoview
.. _ckanext-harvest: https://github.com/ckan/ckanext-harvest
